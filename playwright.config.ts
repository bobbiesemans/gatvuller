import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_APP_PORT || 3011);
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`;
// Locally the installed Microsoft Edge is used, so nothing has to be downloaded.
// CI installs Chromium and leaves the channel unset.
const channel = process.env.PLAYWRIGHT_CHANNEL ?? (process.env.CI ? undefined : "msedge");

export default defineConfig({
  testDir: "e2e",
  outputDir: "test-results/e2e",
  timeout: 90_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL,
    channel,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "nl-BE",
    timezoneId: "Europe/Brussels",
  },
  projects: [
    // The full marketplace lifecycle runs once, on desktop.
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel }, testIgnore: /\.mobile\.spec\.ts$/ },
    // Phone layout, navigation and the customer journey on a small screen.
    { name: "mobile", use: { ...devices["Pixel 5"], channel }, testMatch: /(smoke|customer)\.spec\.ts$|\.mobile\.spec\.ts$/ },
  ],
  // One launcher prepares the e2e database, starts the Stripe stand-in and the app (scripts/qa/e2e-server.mjs).
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "node scripts/qa/e2e-server.mjs",
        url: `${baseURL}/api/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
        stdout: "pipe",
      },
});
