import asyncio, json, re, io, os
from playwright.async_api import async_playwright
import pdfplumber

DEPARTMENTS = [
    {"name": "nyay",      "label": "न्याय विभाग",      "value": "46",    "book": "Shasanadesh UP – न्याय विभाग"},
    {"name": "karmik",    "label": "कार्मिक विभाग",    "value": "163",   "book": "Shasanadesh UP – कार्मिक विभाग"},
    {"name": "vitt",      "label": "वित्त विभाग",       "value": "199",   "book": "Shasanadesh UP – वित्त विभाग"},
    {"name": "madhyamik", "label": "माध्यमिक शिक्षा",  "value": "50002", "book": "Shasanadesh UP – माध्यमिक शिक्षा"},
    {"name": "basic",     "label": "बेसिक शिक्षा",      "value": "50001", "book": "Shasanadesh UP – बेसिक शिक्षा"},
]

BASE_URL = "https://shasanadesh.up.gov.in"
OUTPUT_FILE = os.path.expanduser("~/Downloads/go_entries.json")

SKIP_CATEGORIES = [
    "वित्तीय स्वीकृतियां", "वित्तीय स्वीकृति",
    "प्रशासकीय एवं वित्तीय स्वीकृति", "वित्तीय एवं प्रशासकीय स्वीकृति",
]
SKIP_SUBJECTS = [
    "भवन निर्माण", "रंगाई-पुताई", "मरम्मत कार्य",
    "निर्माण कार्य", "क्रय किये जाने", "वाहन क्रय",
    "फर्नीचर क्रय", "कम्प्यूटर क्रय",
]

all_entries = []
seen_go_numbers = set()

def load_existing():
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, encoding='utf-8') as f:
            data = json.load(f)
        for e in data:
            seen_go_numbers.add(e.get('go_number', ''))
            all_entries.append(e)
        print(f"ℹ️  Resumed: {len(all_entries)} existing entries")

def save():
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_entries, f, ensure_ascii=False, indent=2)

async def fetch_pdf_text(context, pdf_url):
    try:
        pg = await context.new_page()
        resp = await pg.request.get(pdf_url, timeout=30000)
        if resp.status == 200:
            pdf_bytes = await resp.body()
            parts = []
            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                for p in pdf.pages[:6]:
                    t = p.extract_text()
                    if t: parts.append(t)
            await pg.close()
            return "\n".join(parts)
        await pg.close()
    except Exception as e:
        print(f"      PDF err: {e}")
    return ""

async def do_postback(page, target):
    await page.evaluate(f"__doPostBack('{target}', '')")
    await asyncio.sleep(3)

async def scrape_current_page(page, context, dept, dept_entries):
    rows = await page.query_selector_all('table tr')
    saved = skipped = 0
    for row in rows:
        try:
            cells = await row.query_selector_all('td')
            if len(cells) < 5: continue
            col1 = (await cells[1].inner_text()).strip()
            col2 = (await cells[2].inner_text()).strip()
            col3 = (await cells[3].inner_text()).strip()
            col4 = (await cells[4].inner_text()).strip()
            col5 = (await cells[5].inner_text()).strip() if len(cells) > 5 else ""
            if not col2 or col2 == 'शासनादेश संख्या': continue
            if col2 in seen_go_numbers: continue
            seen_go_numbers.add(col2)
            if any(c in col4 for c in SKIP_CATEGORIES): skipped += 1; continue
            if any(k in col5 for k in SKIP_SUBJECTS): skipped += 1; continue
            link_el = await row.query_selector('a[href*="frmPDF"]')
            if not link_el: continue
            pdf_href = await link_el.get_attribute('href') or ''
            pdf_url = BASE_URL + '/' + pdf_href.lstrip('/') if not pdf_href.startswith('http') else pdf_href
            anubhag_parts = col1.split('\n')
            anubhag = anubhag_parts[-1].strip() if len(anubhag_parts) > 1 else col1
            go_text = await fetch_pdf_text(context, pdf_url)
            if not go_text or len(go_text) < 60:
                print(f"    ⚠️  Empty: {col2[:40]}")
                continue
            entry = {
                "id": f"go_{dept['name']}_{len(all_entries)+len(dept_entries)+1:05d}",
                "book": dept["book"],
                "topic": dept["label"],
                "go_number": col2,
                "go_date": col3,
                "anubhag": anubhag,
                "shreni": col4,
                "vishay": col5,
                "content": go_text[:3000],
                "source": "shasanadesh.up.gov.in",
                "keywords": f"shasanadesh {dept['label']} {col2} {col3} {anubhag} {col5[:80]}"
            }
            dept_entries.append(entry)
            saved += 1
            print(f"    ✅ {col2[:35]} | {col3} | {col4[:15]}")
        except: continue
    return saved, skipped

def build_page_sequence(total_pages):
    """
    Build __doPostBack targets for all pages sequentially.
    Pattern observed:
      Group ctl01: pages 1-5  -> ctl01$ctl01 ... ctl01$ctl05
      Group ctl02: next group -> ctl02$ctl00 (next), ctl02$ctl01..ctl05 (pages 6-10)
      Group ctl03: next group -> ctl03$ctl00, ctl03$ctl01..ctl05
      etc.
    Page 1 is already loaded (manual CAPTCHA), so we start from page 2.
    """
    targets = []
    # First group: pages 2-5 (page 1 already done)
    for i in range(2, 6):
        targets.append(f"ItemDataPager$ctl01$ctl{i:02d}")
    # Subsequent groups
    group = 2
    page_in_group = 6
    while page_in_group <= total_pages:
        # "Next group" button
        targets.append(f"ItemDataPager$ctl{group:02d}$ctl00")
        # Pages within this group (up to 5)
        for i in range(1, 6):
            if page_in_group > total_pages: break
            targets.append(f"ItemDataPager$ctl{group:02d}$ctl{i:02d}")
            page_in_group += 1
        group += 1
        if group > 50: break  # safety
    return targets

async def scrape_department(browser, dept, total_pages):
    print(f"\n{'='*60}")
    print(f"  {dept['label']} — {total_pages} pages expected")
    print(f"{'='*60}")

    context = await browser.new_context(
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    )
    page = await context.new_page()
    dept_entries = []

    try:
        await page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
        await asyncio.sleep(2)
        await page.select_option('#ddldept', dept['value'])
        await asyncio.sleep(3)
        try:
            await page.select_option('#ddlsection', '0')
            await asyncio.sleep(1)
        except: pass

        print(f"\n  ⚠️  CAPTCHA BHARNA HAI!")
        print(f"  Browser mein:")
        print(f"  1. CAPTCHA box mein number type karo")
        print(f"  2. 'खोजें' button click karo")
        print(f"  3. Results aane ke baad YAHAN Enter dabao\n")
        input("  >>> Enter dabao jab results aa jayein: ")

        # Page 1
        print(f"  Page 1...")
        s, sk = await scrape_current_page(page, context, dept, dept_entries)
        print(f"  Page 1: {s} saved, {sk} skipped")
        all_entries.extend(dept_entries)
        dept_entries.clear()
        save()

        # Build page sequence
        targets = build_page_sequence(total_pages)
        print(f"  Pagination targets built: {len(targets)} steps for {total_pages} pages\n")

        actual_page = 2
        for target in targets:
            # Skip "next group" buttons — just click them silently
            is_group_btn = '$ctl00' in target
            if not is_group_btn:
                print(f"  Page {actual_page}/{total_pages} [{target}]...")

            await do_postback(page, target)

            if not is_group_btn:
                s, sk = await scrape_current_page(page, context, dept, dept_entries)
                print(f"  Page {actual_page}: {s} saved, {sk} skipped | Total dept: {len(dept_entries)}")

                # Save every 10 pages
                if actual_page % 10 == 0:
                    all_entries.extend(dept_entries)
                    dept_entries.clear()
                    save()
                    print(f"  💾 Saved checkpoint — Total: {len(all_entries)}")

                actual_page += 1

        # Final save for this dept
        all_entries.extend(dept_entries)
        dept_entries.clear()
        save()

    except Exception as e:
        print(f"  ❌ Error: {e}")
        import traceback; traceback.print_exc()
        all_entries.extend(dept_entries)
        save()
    finally:
        await context.close()

    print(f"  ✅ {dept['label']} done. Total so far: {len(all_entries)}")

# ── MAIN ────────────────────────────────────────────────────
DEPT_PAGES = {
    "nyay": 173,
    "karmik": 39,
    "vitt": 132,
    "madhyamik": 54,
    "basic": 46,
}

async def main():
    print("🚀 Nyaysahayak GO Scraper — FINAL v4")
    print(f"Output: {OUTPUT_FILE}\n")
    load_existing()

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)

        for dept in DEPARTMENTS:
            total_pages = DEPT_PAGES[dept['name']]
            await scrape_department(browser, dept, total_pages)
            print(f"💾 Total saved: {len(all_entries)}\n")

        await browser.close()

    print(f"\n✅ COMPLETE! Total: {len(all_entries)}")
    from collections import Counter
    for t, c in Counter(e['topic'] for e in all_entries).most_common():
        print(f"   {t}: {c}")

if __name__ == "__main__":
    asyncio.run(main())
