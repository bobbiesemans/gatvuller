import { expect, test, type Page } from "@playwright/test";

const PUBLIC_PAGES = ["/", "/slots", "/stad/antwerpen", "/categorie/kapper", "/voor-zaken", "/contact", "/privacy", "/voorwaarden", "/login", "/register"];

/** Console errors that come from the page itself; a missing favicon or blocked map tile counts too. */
function collectProblems(page: Page) {
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`console: ${message.text()}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 500) problems.push(`http ${response.status()}: ${response.url()}`);
  });
  return problems;
}

async function overflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

test.describe("public pages", () => {
  for (const path of PUBLIC_PAGES) {
    test(`${path} loads without errors and fits the screen`, async ({ page }) => {
      const problems = collectProblems(page);
      const response = await page.goto(path);
      expect(response?.ok(), `${path} answered ${response?.status()}`).toBeTruthy();
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      await page.waitForLoadState("networkidle").catch(() => undefined);
      expect(await overflow(page), "page is wider than the screen").toBeLessThanOrEqual(1);
      expect(problems).toEqual([]);
    });
  }

  test("an unknown page shows a helpful not-found page", async ({ page }) => {
    const response = await page.goto("/deze-pagina-bestaat-niet");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("link").first()).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("the old impact page redirects home", async ({ page }) => {
    await page.goto("/impact");
    await expect(page).toHaveURL(/\/$/);
  });

  test("health, robots and sitemap answer", async ({ request }) => {
    const health = await request.get("/api/health");
    expect(health.ok()).toBeTruthy();
    expect((await health.json()).ok).toBe(true);
    const robots = await (await request.get("/robots.txt")).text();
    // The e2e server always runs in explicit demo mode. Demo data must never be indexed.
    expect(robots).toMatch(/Disallow: \/(?:\s|$)/);
    expect(robots).not.toMatch(/Sitemap:/);
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/stad/antwerpen");
    expect(sitemap).not.toContain("/impact");
    expect(sitemap).not.toContain("/dashboard");
  });

  test("security headers are set", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBeTruthy();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["strict-transport-security"]).toContain("max-age");
    expect(h["x-powered-by"]).toBeUndefined();
  });
});

test.describe("language", () => {
  test("the chosen language sticks and changes the page", async ({ page }) => {
    await page.goto("/");
    const dutch = await page.getByRole("heading", { level: 1 }).first().innerText();
    await page.context().addCookies([{ name: "NEXT_LOCALE", value: "fr", url: page.url() }]);
    await page.goto("/");
    const french = await page.getByRole("heading", { level: 1 }).first().innerText();
    await page.context().addCookies([{ name: "NEXT_LOCALE", value: "en", url: page.url() }]);
    await page.goto("/");
    const english = await page.getByRole("heading", { level: 1 }).first().innerText();
    expect(new Set([dutch, french, english]).size).toBe(3);
    await expect(page.locator("html")).toHaveAttribute("lang", "en-GB");
  });

  test("?lang= is stored in the cookie and removed from the address", async ({ page }) => {
    await page.goto("/slots?lang=fr");
    await expect(page).toHaveURL(/\/slots$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "fr-BE");
  });
});
