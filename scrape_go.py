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
    "वित्तीय स्वीकृतियां",
    "वित्तीय स्वीकृति",
    "प्रशासकीय एवं वित्तीय स्वीकृति",
    "वित्तीय एवं प्रशासकीय स्वीकृति",
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
        print(f"ℹ️  Resumed: {len(all_entries)} existing entries loaded")

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
                    if t:
                        parts.append(t)
            await pg.close()
            return "\n".join(parts)
        await pg.close()
    except Exception as e:
        print(f"      PDF err: {e}")
    return ""

async def do_postback(page, target, arg=''):
    """Trigger ASP.NET __doPostBack"""
    await page.evaluate(f"__doPostBack('{target}', '{arg}')")
    await asyncio.sleep(3)

async def scrape_page_rows(page, context, dept, dept_entries):
    """Scrape all GO rows on current page"""
    rows = await page.query_selector_all('table tr')
    page_saved = 0
    page_skipped = 0

    for row in rows:
        try:
            cells = await row.query_selector_all('td')
            if len(cells) < 5:
                continue

            col1 = (await cells[1].inner_text()).strip()  # vibhag/anubhag
            col2 = (await cells[2].inner_text()).strip()  # GO number
            col3 = (await cells[3].inner_text()).strip()  # date
            col4 = (await cells[4].inner_text()).strip()  # shreni
            col5 = (await cells[5].inner_text()).strip() if len(cells) > 5 else ""  # vishay

            if not col2 or col2 == 'शासनादेश संख्या':
                continue

            # Deduplicate
            if col2 in seen_go_numbers:
                continue
            seen_go_numbers.add(col2)

            # Filter: skip financial sanction
            if any(cat in col4 for cat in SKIP_CATEGORIES):
                page_skipped += 1
                continue

            # Filter: skip construction/purchase subjects
            if any(kw in col5 for kw in SKIP_SUBJECTS):
                page_skipped += 1
                continue

            # Get PDF link
            link_el = await row.query_selector('a[href*="frmPDF"]')
            if not link_el:
                continue
            pdf_href = await link_el.get_attribute('href') or ''
            pdf_url = BASE_URL + '/' + pdf_href.lstrip('/') if not pdf_href.startswith('http') else pdf_href

            # Extract anubhag
            parts = col1.split('\n')
            anubhag = parts[-1].strip() if len(parts) > 1 else col1

            # Fetch PDF
            go_text = await fetch_pdf_text(context, pdf_url)
            if not go_text or len(go_text) < 60:
                print(f"    ⚠️  Empty PDF: {col2[:40]}")
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
            page_saved += 1
            print(f"    ✅ {col2[:38]} | {col3} | {col4[:18]}")

        except Exception as e:
            continue

    return page_saved, page_skipped

async def get_pagination_targets(page):
    """Get all __doPostBack pagination targets from current page"""
    html = await page.content()
    targets = re.findall(r"__doPostBack\('(ItemDataPager[^']+)',''\)", html)
    return targets

async def scrape_department(browser, dept):
    print(f"\n{'='*60}")
    print(f"  {dept['label']}")
    print(f"{'='*60}")

    context = await browser.new_context(
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    )
    page = await context.new_page()
    dept_entries = []

    try:
        await page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
        await asyncio.sleep(2)

        # Select department
        await page.select_option('#ddldept', dept['value'])
        await asyncio.sleep(3)

        # Select samast anubhag
        try:
            await page.select_option('#ddlsection', '0')
            await asyncio.sleep(1)
        except:
            pass

        # === MANUAL CAPTCHA ===
        print(f"\n  ⚠️  CAPTCHA BHARNA HAI!")
        print(f"  Browser window mein:")
        print(f"  1. CAPTCHA box mein number type karo")
        print(f"  2. 'खोजें' button click karo")
        print(f"  3. Results aane ke baad YAHAN Enter dabao\n")
        input("  >>> Enter dabao jab results screen pe aa jayein: ")

        # Page 1 scrape
        print(f"\n  Page 1 scraping...")
        saved, skipped = await scrape_page_rows(page, context, dept, dept_entries)
        print(f"  Page 1: {saved} saved, {skipped} skipped")
        save()

        # Pagination loop
        page_num = 2
        visited_targets = set()

        while True:
            # Get current pagination targets
            targets = await get_pagination_targets(page)

            # Find next unvisited page target
            # Pattern: ctl01$ctl01=page1, ctl01$ctl02=page2, etc.
            next_target = None
            for t in targets:
                if t not in visited_targets:
                    # Skip "previous" type (ctl02$ctl00 pattern)
                    if '$ctl00' in t and page_num > 2:
                        continue
                    next_target = t
                    break

            if not next_target:
                print(f"  ✅ No more pages")
                break

            visited_targets.add(next_target)
            print(f"\n  Page {page_num} [{next_target}]...")

            await do_postback(page, next_target)
            await asyncio.sleep(2)

            saved, skipped = await scrape_page_rows(page, context, dept, dept_entries)
            print(f"  Page {page_num}: {saved} saved, {skipped} skipped")

            # Save every 5 pages
            if page_num % 5 == 0:
                all_entries.extend(dept_entries)
                dept_entries_temp = dept_entries.copy()
                dept_entries.clear()
                save()
                dept_entries.extend(dept_entries_temp)

            if saved == 0 and skipped == 0:
                print(f"  Empty page — stopping")
                break

            page_num += 1

    except Exception as e:
        print(f"  ❌ Error: {e}")
        import traceback; traceback.print_exc()
    finally:
        await context.close()

    print(f"\n  ✅ {dept['label']}: {len(dept_entries)} entries")
    return dept_entries

async def main():
    print("🚀 Nyaysahayak GO Scraper — FINAL VERSION")
    print(f"Output: {OUTPUT_FILE}\n")
    load_existing()

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)  # Visible for CAPTCHA

        for dept in DEPARTMENTS:
            entries = await scrape_department(browser, dept)
            all_entries.extend(entries)
            save()
            print(f"💾 Total: {len(all_entries)} entries saved\n")

        await browser.close()

    print(f"\n✅ COMPLETE! Total: {len(all_entries)}")
    from collections import Counter
    for t, c in Counter(e['topic'] for e in all_entries).most_common():
        print(f"   {t}: {c}")

if __name__ == "__main__":
    asyncio.run(main())
