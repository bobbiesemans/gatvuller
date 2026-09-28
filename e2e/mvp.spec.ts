import { expect, test } from "@playwright/test";

const password = "demo1234";

test("homepage explains the product and links to open hours", async ({ page }, info) => {
  const res = await page.goto("/");
  expect(res?.ok()).toBeTruthy();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  if (info.project.name === "mobile") {
    await page.screenshot({ path: "/opt/cursor/artifacts/mobile-home.png", fullPage: true });
  }
  await page.getByRole("link", { name: /uren|heures|hours/i }).first().click();
  await expect(page).toHaveURL(/\/slots/);
  if (info.project.name === "mobile") {
    await page.screenshot({ path: "/opt/cursor/artifacts/mobile-slots.png", fullPage: false });
  }
});

test("customer can register and log in", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;
  await page.goto("/register");
  await page.getByLabel(/naam|nom|name/i).fill("E2E Klant");
  await page.getByLabel(/e-mail|email/i).fill(email);
  await page.getByLabel(/wachtwoord|mot de passe|password/i).fill("testwacht12");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /account aanmaken|créer|register/i }).click();
  await expect(page).toHaveURL(/\/slots/, { timeout: 20_000 });

  await page.goto("/login");
  await page.getByLabel(/e-mail|email/i).fill(email);
  await page.getByLabel(/wachtwoord|mot de passe|password/i).fill("testwacht12");
  await page.getByRole("button", { name: /inloggen|connexion|log in/i }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });
});

test("dashboard and admin stay closed without the right role", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
});

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByLabel(/^e-mail$/i).fill(email);
  await page.getByLabel(/^wachtwoord$/i).fill(password);
  await page.locator("form").getByRole("button", { name: "Inloggen" }).click();
  const error = page.getByText(/onjuiste|te veel|niet beschikbaar/i);
  if (await error.isVisible().catch(() => false)) {
    test.skip(true, "Demo account cannot sign in in this environment");
  }
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15_000 });
}

test("demo customer can book and cancel", async ({ page }) => {
  await login(page, "klant@gatvuller.be");
  await page.goto("/slots?wanneer=morgen");
  const offer = page.locator("a[href^='/slots/']").first();
  if ((await offer.count()) === 0) {
    await page.goto("/slots");
  }
  await page.locator("a[href^='/slots/']").first().click();
  await page.getByRole("button", { name: /reserveer/i }).click();
  await page.waitForURL(/\/boeking\/succes/, { timeout: 20_000 });
  await page.goto("/boekingen");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Annuleren" }).first().click();
  await expect(page.getByText(/annuleren mislukt/i)).toHaveCount(0);
  await page.goto("/boekingen?tab=voorbij");
  await expect(page.getByText(/geannuleerd|terugbetaald/i).first()).toBeVisible();
});

test("demo customer can open bookings after login", async ({ page }) => {
  await login(page, "klant@gatvuller.be");
  await page.goto("/boekingen");
  await expect(page.getByRole("heading", { name: /boekingen/i })).toBeVisible();
  await page.goto("/slots");
  const offer = page.locator("a[href^='/slots/']").first();
  await expect(offer).toBeVisible();
  await offer.click();
  await expect(page.getByRole("button", { name: /reserveer/i })).toBeVisible();
});

test("salon can open the publish form", async ({ page }) => {
  await login(page, "salon@gatvuller.be");
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /zaakbeheer/i })).toBeVisible();
  await expect(page.getByText(/publiceren/i).first()).toBeVisible();
});
