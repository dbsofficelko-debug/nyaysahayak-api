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

SKIP_KEYWORDS = [
    "वित्तीय एवं प्रशासकीय स्वीकृति",
    "financial and administrative sanction",
    "की धनराशि",
    "रुपये मात्र स्वीकृत",
    "लाख रुपये की स्वीकृति",
]

all_entries = []
seen_urls = set()

def parse_go_title(title):
    title = title.strip()
    parts = title.split('/')
    go_number = title
    go_date = ""
    anubhag = ""
    years = re.findall(r'\b(20\d{2})\b', title)
    if years:
        go_date = years[0]
    if len(parts) >= 3:
        anubhag = parts[2].strip()
        anubhag = re.sub(r'-20\d{2}-\d+.*', '', anubhag).strip()
    if len(parts) >= 2:
        go_number = parts[0].strip() + "/" + parts[1].strip()
    return go_number, go_date, anubhag

async def fetch_pdf_text(context, pdf_url):
    try:
        pg = await context.new_page()
        response = await pg.request.get(pdf_url, timeout=30000)
        if response.status == 200:
            pdf_bytes = await response.body()
            text_parts = []
            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                for p in pdf.pages[:6]:
                    t = p.extract_text()
                    if t:
                        text_parts.append(t)
            await pg.close()
            return "\n".join(text_parts)
        await pg.close()
    except Exception as e:
        print(f"      PDF error: {e}")
    return ""

async def get_next_page(page):
    try:
        next_btn = await page.query_selector("a[href*='Page$Next'], a[href*='__doPostBack'][title*='Next'], td a:has-text('>')")
        if not next_btn:
            # Try pagination links at bottom
            pager = await page.query_selector_all("table tr td span, table tr td a")
            for el in pager:
                txt = (await el.inner_text()).strip()
                if txt == ">":
                    await el.click()
                    await asyncio.sleep(3)
                    return True
            return False
        await next_btn.click()
        await asyncio.sleep(3)
        return True
    except:
        return False

async def scrape_department(browser, dept):
    print(f"\n{'='*55}")
    print(f"  Fetching: {dept['label']} (value={dept['value']})")
    print(f"{'='*55}")

    context = await browser.new_context(
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
    )
    page = await context.new_page()
    dept_entries = []
    page_num = 1

    try:
        await page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
        await asyncio.sleep(2)
        await page.select_option('#ddldept', dept['value'])
        await asyncio.sleep(4)
        print(f"  Selected. Page {page_num}...")

        while True:
            links = await page.query_selector_all('a')
            go_links = []
            for link in links:
                href = await link.get_attribute('href') or ''
                txt = (await link.inner_text()).strip()
                if 'frmPDF' in href and txt:
                    go_links.append((txt, href))

            if not go_links:
                print(f"  No GOs on page {page_num} — done")
                break

            print(f"  Page {page_num}: {len(go_links)} GOs")

            for title, href in go_links:
                pdf_url = href if href.startswith('http') else BASE_URL + '/' + href.lstrip('/')
                if pdf_url in seen_urls:
                    continue
                seen_urls.add(pdf_url)

                go_number, go_date, anubhag = parse_go_title(title)
                go_text = await fetch_pdf_text(context, pdf_url)

                if not go_text or len(go_text) < 80:
                    print(f"    ⚠️  Empty: {title[:50]}")
                    continue

                if any(kw in go_text[:400] for kw in SKIP_KEYWORDS) and len(go_text) < 600:
                    print(f"    ⏭️  Skip: {title[:40]}")
                    continue

                entry = {
                    "id": f"go_{dept['name']}_{len(all_entries)+len(dept_entries)+1:05d}",
                    "book": dept["book"],
                    "topic": dept["label"],
                    "go_number": go_number,
                    "go_date": go_date,
                    "anubhag": anubhag,
                    "title": title[:250],
                    "content": go_text[:3000],
                    "source": "shasanadesh.up.gov.in",
                    "keywords": f"shasanadesh {dept['label']} {go_number} {go_date} {anubhag} {title[:80]}"
                }
                dept_entries.append(entry)
                print(f"    ✅ {go_number} | {anubhag[:25]} | {go_date}")

            has_next = await get_next_page(page)
            if not has_next:
                print(f"  Last page reached for {dept['label']}")
                break
            page_num += 1

    except Exception as e:
        print(f"  ❌ Error: {e}")
    finally:
        await context.close()

    print(f"  ✅ {dept['label']}: {len(dept_entries)} entries")
    return dept_entries

async def main():
    print("🚀 Nyaysahayak GO Scraper v2")
    print(f"Output: {OUTPUT_FILE}\n")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        for dept in DEPARTMENTS:
            entries = await scrape_department(browser, dept)
            all_entries.extend(entries)
            with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
                json.dump(all_entries, f, ensure_ascii=False, indent=2)
            print(f"💾 Total saved: {len(all_entries)}\n")
        await browser.close()

    print(f"\n✅ COMPLETE! Total: {len(all_entries)}")
    from collections import Counter
    for t, c in Counter(e['topic'] for e in all_entries).most_common():
        print(f"   {t}: {c}")

if __name__ == "__main__":
    asyncio.run(main())
