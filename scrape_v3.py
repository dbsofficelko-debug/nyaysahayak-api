import asyncio, json, base64
from playwright.async_api import async_playwright
from twocaptcha import TwoCaptcha

API_KEY = "4945efb27ad9e70227778a42827a56c4"
solver = TwoCaptcha(API_KEY)

DEPARTMENTS = [
    {"name": "grah", "label": "गृह विभाग", "value": "165"},
    {"name": "nyay", "label": "न्याय विभाग", "value": "46"},
    {"name": "karmik", "label": "कार्मिक विभाग", "value": "163"},
    {"name": "vitt", "label": "संस्थागत वित्त एवं बैंकिंग", "value": "199"},
    {"name": "rajaswa", "label": "स्टाम्प एवं रजिस्ट्रेशन", "value": "94"},
    {"name": "madhyamik", "label": "माध्यमिक शिक्षा", "value": "50002"},
    {"name": "basic", "label": "बेसिक शिक्षा", "value": "50001"},
    {"name": "sainik", "label": "सैनिक कल्याण", "value": "209"},
    {"name": "urja", "label": "ऊर्जा विभाग", "value": "1"},
]

all_entries = []

async def solve_captcha(page):
    try:
        captcha_img = page.locator("img[id='Image1']")
        if await captcha_img.count() == 0:
            print("  No captcha image found!")
            return None
        img_src = await captcha_img.first.get_attribute("src")
        if img_src.startswith("data:image"):
            b64 = img_src.split(",")[1]
        else:
            full_url = "https://shasanadesh.up.gov.in/" + img_src.lstrip("/")
            response = await page.request.get(full_url)
            b64 = base64.b64encode(await response.body()).decode()
        print("  Solving CAPTCHA via 2captcha...")
        result = solver.normal(b64)
        print(f"  CAPTCHA solved: {result['code']}")
        return result["code"]
    except Exception as e:
        print(f"  CAPTCHA error: {e}")
        return None

async def scrape():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        page.set_default_timeout(60000)

        for dept in DEPARTMENTS:
            print(f"\n========================================")
            print(f"Fetching: {dept['label']}...")

            await page.goto("https://shasanadesh.up.gov.in/")
            await page.wait_for_load_state("networkidle")
            await asyncio.sleep(3)

            try:
                await page.select_option("select[name='ddldept']", dept["value"])
                await asyncio.sleep(2)
            except Exception as e:
                print(f"  Dropdown error: {e}")
                continue

            try:
                await page.select_option("select[name='ddlPageSize']", "100")
            except:
                pass

            captcha_code = await solve_captcha(page)
            if not captcha_code:
                print(f"  Skipping {dept['label']} - CAPTCHA failed")
                continue

            captcha_input = page.locator("input[name*='captcha'], input[id*='captcha'], input[id*='Captcha'], input[name*='Captcha']")
            if await captcha_input.count() > 0:
                await captcha_input.first.fill(captcha_code)
            else:
                print("  CAPTCHA input box not found!")
                continue

            buttons = page.locator("input[type='submit'], input[type='button'], button")
            btn_count = await buttons.count()
            clicked = False
            for i in range(btn_count):
                btn = buttons.nth(i)
                val = (await btn.get_attribute("value") or "").strip()
                txt = (await btn.text_content() or "").strip()
                if "खोज" in val or "खोज" in txt or "search" in val.lower():
                    await btn.click()
                    clicked = True
                    break
            if not clicked:
                await buttons.first.click()

            await page.wait_for_load_state("networkidle")
            await asyncio.sleep(3)

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

    with open("/Users/pramodkumarupadhyay/Downloads/shasanadesh_v3.json", "w", encoding="utf-8") as f:
        json.dump(all_entries, f, ensure_ascii=False, indent=2)

    print(f"\nGRAND TOTAL: {len(all_entries)} entries saved!")

asyncio.run(scrape())
