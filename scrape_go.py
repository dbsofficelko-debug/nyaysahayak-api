import asyncio, json, re, io, os
from playwright.async_playwright import async_playwright
import pdfplumber

# ── Target Departments ──────────────────────────────────────
DEPARTMENTS = [
    {"name": "nyay",       "label": "न्याय विभाग",        "value": "46",    "book": "Shasanadesh UP – न्याय विभाग"},
    {"name": "karmik",     "label": "कार्मिक विभाग",      "value": "163",   "book": "Shasanadesh UP – कार्मिक विभाग"},
    {"name": "vitt",       "label": "वित्त विभाग",         "value": "199",   "book": "Shasanadesh UP – वित्त विभाग"},
    {"name": "madhyamik",  "label": "माध्यमिक शिक्षा",    "value": "50002", "book": "Shasanadesh UP – माध्यमिक शिक्षा"},
    {"name": "basic",      "label": "बेसिक शिक्षा",        "value": "50001", "book": "Shasanadesh UP – बेसिक शिक्षा"},
]

BASE_URL = "https://shasanadesh.up.gov.in"
OUTPUT_FILE = os.path.expanduser("~/Downloads/go_entries.json")
all_entries = []
seen_go_numbers = set()

def clean_text(text):
    if not text:
        return ""
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def extract_go_metadata(text):
    """Extract GO number, date, department/section from text"""
    go_number = ""
    go_date = ""
    anubhag = ""

    # GO Number patterns
    patterns_go = [
        r'सं[०-९\d][\s\-/]*([\d/\-]+)',
        r'संख्या[\s:–-]*([\d/\-A-Za-z]+)',
        r'No\.?\s*([\d/\-]+)',
        r'क्रमांक[\s:–-]*([\d/\-]+)',
    ]
    for p in patterns_go:
        m = re.search(p, text[:500])
        if m:
            go_number = m.group(1).strip()
            break

    # Date patterns
    patterns_date = [
        r'दिनांक[\s:–-]*([\d]{1,2}[\s/\-\.]+[\d]{1,2}[\s/\-\.]+[\d]{2,4})',
        r'dated?[\s:–-]*([\d]{1,2}[\s/\-\.]+[\d]{1,2}[\s/\-\.]+[\d]{2,4})',
        r'(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})',
    ]
    for p in patterns_date:
        m = re.search(p, text[:600])
        if m:
            go_date = m.group(1).strip()
            break

    # Anubhag/Section
    patterns_sec = [
        r'अनुभाग[\s:–-]*([^\n,।]{3,40})',
        r'Section[\s:–-]*([^\n,]{3,40})',
        r'शाखा[\s:–-]*([^\n,।]{3,40})',
    ]
    for p in patterns_sec:
        m = re.search(p, text[:800])
        if m:
            anubhag = m.group(1).strip()
            break

    return go_number, go_date, anubhag

async def fetch_pdf_text(page, pdf_url):
    """Download PDF and extract text"""
    try:
        response = await page.request.get(pdf_url, timeout=30000)
        if response.status == 200:
            pdf_bytes = await response.body()
            text_parts = []
            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                for pg in pdf.pages[:8]:  # max 8 pages per GO
                    t = pg.extract_text()
                    if t:
                        text_parts.append(t)
            return "\n".join(text_parts)
    except Exception as e:
        print(f"    PDF error: {e}")
    return ""

async def scrape_department(browser, dept):
    print(f"\n{'='*50}")
    print(f"Fetching: {dept['label']} (value={dept['value']})")
    print(f"{'='*50}")

    context = await browser.new_context(
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
    )
    page = await context.new_page()
    dept_entries = []
    page_num = 1

    try:
        # Load main page first
        await page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
        await asyncio.sleep(2)

        while True:
            print(f"  Page {page_num}...")

            # Navigate to department GO list
            list_url = f"{BASE_URL}/hi/government-orders?dept_id={dept['value']}&page={page_num}"
            await page.goto(list_url, wait_until="networkidle", timeout=30000)
            await asyncio.sleep(1.5)

            # Find all GO links on this page
            go_links = await page.query_selector_all("a[href*='government-order'], a[href*='go-detail'], a[href*='.pdf'], td a")

            if not go_links:
                # Try alternate selectors
                go_links = await page.query_selector_all("table tr td a, .go-list a, .list-group-item")

            if not go_links:
                print(f"  No links found on page {page_num} — stopping")
                break

            print(f"  Found {len(go_links)} links")
            processed = 0

            for link in go_links:
                try:
                    href = await link.get_attribute("href")
                    link_text = await link.inner_text()
                    link_text = clean_text(link_text)

                    if not href or len(link_text) < 5:
                        continue

                    # Build full URL
                    if href.startswith("/"):
                        full_url = BASE_URL + href
                    elif href.startswith("http"):
                        full_url = href
                    else:
                        continue

                    # Skip if already processed
                    if full_url in seen_go_numbers:
                        continue
                    seen_go_numbers.add(full_url)

                    go_text = ""
                    go_number = ""
                    go_date = ""
                    anubhag = ""
                    title = link_text

                    if href.endswith(".pdf") or "pdf" in href.lower():
                        # Direct PDF
                        print(f"    PDF: {link_text[:50]}...")
                        go_text = await fetch_pdf_text(page, full_url)
                    else:
                        # GO detail page
                        detail_page = await context.new_page()
                        try:
                            await detail_page.goto(full_url, wait_until="networkidle", timeout=20000)
                            await asyncio.sleep(1)

                            # Try to get title
                            title_el = await detail_page.query_selector("h1, h2, .go-title, .title")
                            if title_el:
                                title = clean_text(await title_el.inner_text()) or link_text

                            # Get GO number from page
                            go_no_el = await detail_page.query_selector(".go-number, [class*='number'], td:first-child")
                            if go_no_el:
                                go_number = clean_text(await go_no_el.inner_text())

                            # Get date
                            date_el = await detail_page.query_selector(".go-date, [class*='date'], .date")
                            if date_el:
                                go_date = clean_text(await date_el.inner_text())

                            # Get main content
                            content_el = await detail_page.query_selector(".go-content, .content, main, article, #content")
                            if content_el:
                                go_text = clean_text(await content_el.inner_text())
                            else:
                                go_text = clean_text(await detail_page.inner_text("body"))

                            # Check for PDF link inside detail page
                            pdf_link = await detail_page.query_selector("a[href$='.pdf']")
                            if pdf_link and len(go_text) < 200:
                                pdf_href = await pdf_link.get_attribute("href")
                                if pdf_href:
                                    pdf_url = BASE_URL + pdf_href if pdf_href.startswith("/") else pdf_href
                                    go_text = await fetch_pdf_text(page, pdf_url)

                        finally:
                            await detail_page.close()

                    if not go_text or len(go_text) < 50:
                        continue

                    # Extract metadata from text if not found
                    if not go_number or not go_date:
                        gn, gd, ga = extract_go_metadata(go_text)
                        go_number = go_number or gn
                        go_date = go_date or gd
                        anubhag = anubhag or ga

                    # Skip pure financial sanction GOs (dhanrashi only)
                    skip_keywords = ["वित्तीय एवं प्रशासकीय स्वीकृति", "financial and administrative sanction",
                                     "₹", "रुपये मात्र", "लाख रुपये"]
                    if any(kw in go_text[:300] for kw in skip_keywords) and len(go_text) < 500:
                        continue

                    entry = {
                        "id": f"go_{dept['name']}_{len(all_entries) + len(dept_entries) + 1:04d}",
                        "book": dept["book"],
                        "topic": dept["label"],
                        "go_number": go_number,
                        "go_date": go_date,
                        "anubhag": anubhag,
                        "title": title[:200],
                        "content": go_text[:3000],
                        "source": "shasanadesh.up.gov.in",
                        "keywords": f"shasanadesh {dept['label']} {go_number} {go_date} {title[:100]}"
                    }
                    dept_entries.append(entry)
                    processed += 1
                    print(f"    ✅ [{processed}] {title[:60]} | GO: {go_number} | Date: {go_date}")

                except Exception as e:
                    print(f"    ⚠️ Link error: {e}")
                    continue

            if processed == 0:
                print(f"  No new entries on page {page_num} — done with {dept['label']}")
                break

            page_num += 1
            await asyncio.sleep(2)

    except Exception as e:
        print(f"  Department error: {e}")
    finally:
        await context.close()

    print(f"\n  ✅ {dept['label']}: {len(dept_entries)} entries fetched")
    return dept_entries

async def main():
    print("🚀 Nyaysahayak GO Scraper — shasanadesh.up.gov.in")
    print(f"Target departments: {[d['label'] for d in DEPARTMENTS]}")
    print(f"Output: {OUTPUT_FILE}\n")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        for dept in DEPARTMENTS:
            entries = await scrape_department(browser, dept)
            all_entries.extend(entries)

            # Save after each department
            with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
                json.dump(all_entries, f, ensure_ascii=False, indent=2)
            print(f"💾 Saved so far: {len(all_entries)} entries → {OUTPUT_FILE}")

        await browser.close()

    print(f"\n{'='*50}")
    print(f"✅ COMPLETE! Total entries: {len(all_entries)}")
    print(f"📁 File saved: {OUTPUT_FILE}")

    # Department summary
    from collections import Counter
    topics = Counter(e['topic'] for e in all_entries)
    for t, c in topics.most_common():
        print(f"   {t}: {c} entries")

if __name__ == "__main__":
    asyncio.run(main())
