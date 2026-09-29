#!/usr/bin/env node
/**
 * Visual QA helper: opens a page in the installed Microsoft Edge (no browser download),
 * optionally signed in as a seed account, in a chosen language and screen size, and saves a screenshot.
 * Local development only: the seed accounts exist just in the local test database.
 *
 *   node scripts/qa/shot.mjs /slots out/slots-mobile.png --size=mobile --lang=fr
 *   node scripts/qa/shot.mjs /dashboard out/dash.png --as=owner --size=desktop --full
 *
 * Options
 *   --base=http://127.0.0.1:3010   server to open
 *   --lang=nl|fr|en                language cookie (default nl)
 *   --size=mobile|tablet|desktop   390x844, 820x1180 or 1280x900 (default mobile)
 *   --as=customer|owner|admin      sign in as the seed account of that role first
 *   --full                         capture the whole page instead of the first screen
 *   --text                         print the visible text of <main> as well
 */
import { readFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { chromium } from "@playwright/test";

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith("--"));
const opt = Object.fromEntries(
  args.filter((a) => a.startsWith("--")).map((a) => {
    const [k, v] = a.slice(2).split("=");
    return [k, v ?? true];
  })
);

const [rawPath = "/", out = "qa-shot.png"] = positional;
// Git Bash rewrites "/slots" into "C:/Program Files/Git/slots" before Node sees it; undo that.
const path = "/" + rawPath.replace(/^[A-Za-z]:[\\/].*?[\\/]Git(?=[\\/])/i, "").replace(/^\/+/, "");
const base = opt.base || "http://127.0.0.1:3010";
const SIZES = { mobile: { width: 390, height: 844 }, tablet: { width: 820, height: 1180 }, desktop: { width: 1280, height: 900 } };
const size = SIZES[opt.size || "mobile"];
if (!size) throw new Error(`Unknown --size=${opt.size}`);
const ACCOUNTS = { customer: "klant@gatvuller.be", owner: "salon@gatvuller.be", admin: "admin@gatvuller.be" };

const hostname = new URL(base).hostname;
if (!["127.0.0.1", "localhost"].includes(hostname)) throw new Error("shot.mjs only signs in on a local server");

function seedPassword() {
  const seed = readFileSync(new URL("../../prisma/seed.ts", import.meta.url), "utf8");
  const match = /hash\("([^"]+)"/.exec(seed);
  if (!match) throw new Error("Could not read the seed password");
  return match[1];
}

const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({ viewport: size, deviceScaleFactor: 1, isMobile: size.width < 500, hasTouch: size.width < 500 });
await context.addCookies([{ name: "NEXT_LOCALE", value: opt.lang || "nl", url: base }]);
const page = await context.newPage();

const problems = [];
page.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text().slice(0, 200)}`));
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message.slice(0, 200)}`));
page.on("requestfailed", (r) => problems.push(`requestfailed: ${r.url().slice(0, 120)}`));
page.on("response", (r) => r.status() >= 400 && problems.push(`http ${r.status()}: ${r.url().slice(0, 120)}`));

if (opt.as) {
  const email = ACCOUNTS[opt.as];
  if (!email) throw new Error(`Unknown --as=${opt.as}`);
  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
  await page.locator("input[type=email]").fill(email);
  await page.locator("input[type=password]").fill(seedPassword());
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20_000 }),
    page.locator("form button[type=submit]").click(),
  ]);
}

let gotoError = null;
const response = await page.goto(`${base}${path}`, { waitUntil: "load", timeout: 60_000 }).catch((e) => {
  gotoError = String(e.message).split("\n")[0];
  return null;
});
await page.locator("main").first().waitFor({ timeout: 15_000 }).catch(() => undefined);
await page.waitForTimeout(1500);
mkdirSync(dirname(out), { recursive: true });
await page.screenshot({ path: out, fullPage: Boolean(opt.full) });
if (gotoError) problems.push(`goto: ${gotoError}`);
console.log(`${response?.status() ?? "no response"} ${page.url()} -> ${out} (${size.width}x${size.height}, ${opt.lang || "nl"}${opt.as ? `, as ${opt.as}` : ""})`);
if (opt.text) console.log("--- text\n" + (await page.locator("main").innerText().catch(() => "")).slice(0, 6000));
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
if (overflow > 1) problems.push(`horizontal overflow: page is ${overflow}px wider than the screen`);
if (problems.length) console.log("--- problems\n" + [...new Set(problems)].join("\n"));
await browser.close();
