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

# Skip these श्रेणी — not useful for KB
SKIP_CATEGORIES = [
    "वित्तीय स्वीकृतियां",
    "वित्तीय स्वीकृति",
    "प्रशासकीय एवं वित्तीय स्वीकृति",
    "financial sanction",
]

# Skip if विषय contains these
SKIP_SUBJECT_KEYWORDS = [
    "भवन निर्माण",
    "रंगाई-पुताई",
    "मरम्मत कार्य",
    "निर्माण कार्य",
    "क्रय किये जाने",
    "वाहन क्रय",
]

all_entries = []
seen_go_numbers = set()

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
            full_text = "\n".join(text_parts)
            return full_text
        await pg.close()
    except Exception as e:
        print(f"      PDF error: {e}")
    return ""

async def scrape_department(browser, dept):
    print(f"\n{'='*60}")
    print(f"  {dept['label']} (value={dept['value']})")
    print(f"{'='*60}")

    context = await browser.new_context(
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
    )
    page = await context.new_page()
    dept_entries = []
    page_num = 1
    total_skipped = 0

    try:
        # Load site
        await page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
        await asyncio.sleep(2)

        # Step 1: Select department
        await page.select_option('#ddldept', dept['value'])
        await asyncio.sleep(3)
        print(f"  ✅ Department selected")

        # Step 2: Select "समस्त" in anubhag (section) dropdown if available
        try:
            await page.select_option('#ddlsection', '0')
            await asyncio.sleep(1)
            print(f"  ✅ Anubhag: समस्त selected")
        except:
            print(f"  ℹ️  No anubhag dropdown")

        # Step 3: Select "समस्त" in shreni (category) dropdown if available
        try:
            await page.select_option('#ddlshreni', '0')
            await asyncio.sleep(1)
        except:
            pass

        # Step 4: Click खोजें button (no captcha needed after dept selection)
        try:
            search_btn = await page.query_selector('#btnSearch, input[value="खोजें"], button:has-text("खोजें")')
            if search_btn:
                await search_btn.click()
                await asyncio.sleep(4)
                print(f"  ✅ Search clicked")
        except Exception as e:
            print(f"  ℹ️  Search button: {e}")

        # Step 5: Set 100 records per page if possible
        try:
            await page.select_option('select[name*="PageSize"], select[id*="pagesize"], select[id*="PageSize"]', '100')
            await asyncio.sleep(3)
            print(f"  ✅ 100 per page set")
        except:
            pass

        # Step 6: Scrape all pages
        while True:
            print(f"\n  --- Page {page_num} ---")

            # Wait for table to load
            await asyncio.sleep(2)

            # Get all rows from the GO table
            rows = await page.query_selector_all('table tr')
            if len(rows) < 2:
                print(f"  No table rows found — stopping")
                break

            page_go_count = 0
            page_skip_count = 0

            for row in rows:
                try:
                    cells = await row.query_selector_all('td')
                    if len(cells) < 5:
                        continue

                    # Extract columns
                    vibhag_anubhag = (await cells[1].inner_text()).strip()
                    go_number_raw  = (await cells[2].inner_text()).strip()
                    go_date        = (await cells[3].inner_text()).strip()
                    shreni         = (await cells[4].inner_text()).strip()
                    vishay         = (await cells[5].inner_text()).strip() if len(cells) > 5 else ""

                    # Get PDF link
                    link_el = await row.query_selector('a[href*="frmPDF"], a:has-text("शासनादेश देखें")')
                    if not link_el:
                        continue

                    pdf_href = await link_el.get_attribute('href') or ''
                    pdf_url = BASE_URL + '/' + pdf_href.lstrip('/') if not pdf_href.startswith('http') else pdf_href

                    # Skip if already seen
                    if go_number_raw in seen_go_numbers:
                        continue
                    seen_go_numbers.add(go_number_raw)

                    # FILTER 1: Skip by श्रेणी
                    if any(cat.lower() in shreni.lower() for cat in SKIP_CATEGORIES):
                        page_skip_count += 1
                        total_skipped += 1
                        continue

                    # FILTER 2: Skip by विषय keywords
                    if any(kw in vishay for kw in SKIP_SUBJECT_KEYWORDS):
                        page_skip_count += 1
                        total_skipped += 1
                        continue

                    # Extract anubhag from vibhag_anubhag
                    parts = vibhag_anubhag.split('\n')
                    anubhag = parts[1].strip() if len(parts) > 1 else ""

                    # Fetch PDF text
                    go_text = await fetch_pdf_text(context, pdf_url)

                    if not go_text or len(go_text) < 60:
                        print(f"    ⚠️  Empty PDF: {go_number_raw[:40]}")
                        continue

                    entry = {
                        "id": f"go_{dept['name']}_{len(all_entries)+len(dept_entries)+1:05d}",
                        "book": dept["book"],
                        "topic": dept["label"],
                        "go_number": go_number_raw,
                        "go_date": go_date,
                        "anubhag": anubhag,
                        "shreni": shreni,
                        "vishay": vishay,
                        "content": go_text[:3000],
                        "source": "shasanadesh.up.gov.in",
                        "keywords": f"shasanadesh {dept['label']} {go_number_raw} {go_date} {anubhag} {vishay[:80]}"
                    }
                    dept_entries.append(entry)
                    page_go_count += 1
                    print(f"    ✅ {go_number_raw[:35]} | {go_date} | {shreni[:20]}")

                except Exception as e:
                    continue

            print(f"  Page {page_num}: {page_go_count} saved, {page_skip_count} skipped")

            if page_go_count == 0 and page_num > 1:
                print(f"  No new entries — stopping")
                break

            # Save after each page
            with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
                json.dump(all_entries + dept_entries, f, ensure_ascii=False, indent=2)

            # Go to next page
            next_found = False
            try:
                # Find pagination — look for ">" or "अगला" or next page number
                pager_links = await page.query_selector_all('table td a, span a')
                current_found = False
                for el in pager_links:
                    txt = (await el.inner_text()).strip()
                    if txt == str(page_num):
                        current_found = True
                        continue
                    if current_found and txt.isdigit():
                        await el.click()
                        await asyncio.sleep(3)
                        next_found = True
                        break
                    if txt in ['>', 'अगला', 'Next']:
                        await el.click()
                        await asyncio.sleep(3)
                        next_found = True
                        break
            except Exception as e:
                print(f"  Pagination error: {e}")

            if not next_found:
                print(f"  ✅ All pages done for {dept['label']}")
                break

            page_num += 1

    except Exception as e:
        print(f"  ❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await context.close()

    print(f"\n  ✅ {dept['label']}: {len(dept_entries)} entries saved, {total_skipped} skipped")
    return dept_entries

async def main():
    print("🚀 Nyaysahayak GO Scraper v3")
    print(f"Output: {OUTPUT_FILE}\n")

    # Load existing if resuming
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE) as f:
            existing = json.load(f)
        if existing:
            print(f"ℹ️  Resuming — {len(existing)} entries already saved")
            all_entries.extend(existing)
            for e in existing:
                seen_go_numbers.add(e.get('go_number', ''))

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        for dept in DEPARTMENTS:
            entries = await scrape_department(browser, dept)
            all_entries.extend(entries)
            with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
                json.dump(all_entries, f, ensure_ascii=False, indent=2)
            print(f"💾 Total saved: {len(all_entries)}\n")

        await browser.close()

    print(f"\n{'='*60}")
    print(f"✅ COMPLETE! Total: {len(all_entries)} entries")
    from collections import Counter
    for t, c in Counter(e['topic'] for e in all_entries).most_common():
        print(f"   {t}: {c}")

if __name__ == "__main__":
    asyncio.run(main())
