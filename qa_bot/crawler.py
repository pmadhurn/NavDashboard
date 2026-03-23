from playwright.sync_api import sync_playwright
import time

BASE_URL = "http://localhost"

visited = set()
errors = []


def login(page):
    print("🔐 Logging in...")

    page.goto(f"{BASE_URL}/login", wait_until="networkidle")

    # Wait for inputs to be visible
    page.wait_for_selector("input")

    inputs = page.query_selector_all("input")

    if len(inputs) < 2:
        raise Exception("❌ Login inputs not found")

    # Fill email + password
    inputs[0].fill("admin@navdashboard.com")
    inputs[1].fill("admin@123")

    # Press Enter (more reliable than button click)
    inputs[1].press("Enter")

    # Wait for navigation or API response
    page.wait_for_timeout(4000)

    print(f"🔍 After login URL: {page.url}")

    # Check if still on login → failed
    if "/login" in page.url:
        errors.append("❌ Login failed (still on login page)")
    else:
        print("✅ Login successful")


def setup_listeners(page):
    page.on(
        "console",
        lambda msg: errors.append(f"Console error: {msg.text}")
        if msg.type == "error"
        else None,
    )

    page.on(
        "requestfailed",
        lambda req: errors.append(f"Request failed: {req.url}"),
    )

    page.on(
        "response",
        lambda res: errors.append(f"API error {res.status}: {res.url}")
        if res.status >= 400
        else None,
    )


def crawl(page, depth=0, max_depth=3):
    if depth > max_depth:
        return

    current_url = page.url

    if current_url in visited:
        errors.append(f"Loop detected at {current_url}")
        return

    visited.add(current_url)

    print(f"🌐 Visiting: {current_url}")

    time.sleep(1)

    # Detect infinite loader
    content = page.content().lower()
    if "loading" in content:
        errors.append(f"⚠️ Possible infinite loader at {current_url}")

    # Click buttons
    buttons = page.query_selector_all("button")

    for i, btn in enumerate(buttons):
        try:
            btn.click(timeout=2000)
            time.sleep(1)

            if page.url != current_url:
                crawl(page, depth + 1)
                page.go_back()
        except:
            continue

    # Follow links
    links = page.query_selector_all("a")

    for link in links:
        try:
            href = link.get_attribute("href")
            if href and href.startswith("/"):
                page.goto(BASE_URL + href)
                crawl(page, depth + 1)
        except:
            continue


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=300)
        page = browser.new_page()

        setup_listeners(page)

        login(page)

        crawl(page)

        print("\n==== 🚨 ERRORS FOUND ====\n")

        if not errors:
            print("✅ No errors detected")
        else:
            for err in errors:
                print(err)

        browser.close()


if __name__ == "__main__":
    run()