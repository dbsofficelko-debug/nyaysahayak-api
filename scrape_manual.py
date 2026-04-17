import asyncio, json
from playwright.async_api import async_playwright

DEPARTMENTS = [
    {"name": "grah", "label": "गृह विभाग", "value": "165"},
    {"name": "nyay", "label": "न्याय विभाग", "value": "46"},
    {"name": "karmik", "label": "कार्मिक विभाग", "value": "163"},
    {"name": "vitt", "label": "वित्त विभाग", "value": "199"},
    {"name": "rajaswa", "label": "स्टाम्प एवं रजिस्ट्रेशन", "value": "94"},
    {"name": "madhyamik", "label": "माध्यमिक शिक्षा", "value": "50002"},
    {"name": "basic", "label": "बेसिक शिक्षा", "value": "50001"},
    {"name": "sainik", "label": "सैनिक कल्याण", "value": "209"},
    {"name": "urja", "label": "ऊर्जा विभाग", "value": "1"},
]

all_entries = []

async def scrape():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()
        page.set_default_timeout(120000)

        for dept in DEPARTMENTS:
            print(f"\n========================================")
            print(f"Fetching: {dept['label']}...")

            await page.goto("https://shasanadesh.up.gov.in/")
            await page.wait_for_load_state("networkidle")
            await asyncio.sleep(2)

            await page.select_option("select[name='ddldept']", dept["value"])
            await asyncio.sleep(1)

            try:
                await page.select_option("select[name='ddlPageSize']", "100")
            except:
                pass

            print(f"  >> Browser mein CAPTCHA bharo aur KHOJE button dabao!")
            print(f"  >> Phir terminal mein Enter dabaao...")
            input()

            await page.wait_for_load_state("networkidle")
            await asyncio.sleep(2)

            dept_total = 0
            page_num = 1

            while True:
                rows = await page.locator("table tr").all()
                count = 0
                for row in rows[1:]:
                    cells = await row.locator("td").all()
                    if len(cells) < 3:
                        continue
                    try:
                        col0 = (await cells[0].text_content()).strip()
                        col1 = (await cells[1].text_content()).strip()
                        col2 = (await cells[2].text_content()).strip()
                        if col1 and len(col1) > 5:
                            all_entries.append({
                                "topic": dept["label"],
                                "keywords": f"shasanadesh up {dept['label']} {col1[:60]}",
                                "content": f"शासनादेश संख्या: {col0}\nविषय: {col1}\nविवरण: {col2}",
                                "source": "shasanadesh.up.gov.in"
                            })
                            count += 1
                    except:
                        pass

                dept_total += count
                print(f"  Page {page_num}: {count} entries")

                try:
                    next_btn = page.locator("a:has-text('Next')")
                    if await next_btn.count() > 0:
                        await next_btn.first.click()
                        await page.wait_for_load_state("networkidle")
                        await asyncio.sleep(2)
                        page_num += 1
                    else:
                        break
                except:
                    break

            print(f"  {dept['label']} TOTAL: {dept_total}")

        await browser.close()

    with open("/Users/pramodkumarupadhyay/Downloads/shasanadesh_manual.json", "w", encoding="utf-8") as f:
        json.dump(all_entries, f, ensure_ascii=False, indent=2)

    print(f"\nGRAND TOTAL: {len(all_entries)} entries saved!")

asyncio.run(scrape())
