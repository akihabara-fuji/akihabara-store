const { test, expect } = require("@playwright/test");
const fs = require("fs");
const sizes = [["1440x900", 1440, 900], ["1366x768", 1366, 768], ["768x1024", 768, 1024], ["390x844", 390, 844], ["360x800", 360, 800]];
const routes = ["/", "/blog", "/ms/masuk", "/ms/privasi", "/ms/ketentuan", "/ms/studio", "/admin"];
// Error jaringan font/CDN di sandbox tanpa internet tidak dihitung.
const ignorable = (t) => /ERR_TUNNEL|ERR_NAME_NOT_RESOLVED|ERR_INTERNET|Failed to load resource/.test(t);

for (const r of routes) {
  for (const [n, w, h] of sizes) {
    test(`${r} @${n}: 200, tanpa error JS, tanpa overflow horizontal`, async ({ page }) => {
      const errs = [];
      page.on("pageerror", (e) => errs.push(e.message));
      page.on("console", (m) => m.type() === "error" && !ignorable(m.text()) && errs.push(m.text()));
      await page.setViewportSize({ width: w, height: h });
      const res = await page.goto(r, { waitUntil: "networkidle" });
      expect(res.status()).toBe(200);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      expect(errs).toEqual([]);
    });
  }
}

test("beranda: heading, nav, CTA, gambar penting", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator("h1").first()).toBeVisible();
  await expect(page.locator("nav").first()).toBeVisible();
  await expect(page.locator("#ctaAnalisa")).toBeVisible();
  const bad = await page.evaluate(() => [...document.images].filter((i) => i.loading !== "lazy" && (!i.complete || !i.naturalWidth)).map((i) => i.src));
  expect(bad).toEqual([]);
  await expect(page.locator("text=Chat Admin")).toHaveCount(0);
});

test("beranda: link Studio Konten membuka /ms/studio", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.locator('a.btn[href="/ms/studio"]').click();
  await expect(page).toHaveURL(/\/ms\/studio$/);
  await expect(page.locator("h1")).toContainText("konten");
});

test("menu mobile membuka dan menutup", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "networkidle" });
  const btn = page.locator("#burger");
  await expect(btn).toBeVisible();
  await btn.click();
  await expect(btn).toHaveAttribute("aria-expanded", "true");
  await btn.click();
  await expect(btn).toHaveAttribute("aria-expanded", "false");
});

test("studio: unggah foto, hook, caption, unduh PNG", async ({ page }) => {
  const img = "test-artifacts/fixture.png";
  fs.mkdirSync("test-artifacts", { recursive: true });
  fs.writeFileSync(img, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"));
  await page.goto("/ms/studio", { waitUntil: "networkidle" });
  await page.setInputFiles("#file", img);
  await page.fill("#head", "Judul tes");
  await page.fill("#topic", "skincare");
  await page.click("#hookGo");
  expect(await page.locator("#hooks > *").count()).toBeGreaterThan(5);
  await page.click("#capGo");
  const [d] = await Promise.all([page.waitForEvent("download"), page.click("#dl")]);
  expect(d.suggestedFilename()).toMatch(/\.png$/);
});

test("screenshot beranda 3 ukuran", async ({ page }) => {
  for (const [n, w, h] of sizes) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `test-artifacts/home-${n}.png` });
  }
});

test("akademik: grid 2 kolom tidak tertimpa kelas dekorasi hero", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "networkidle" });
  const box = await page.locator("#akademik .g2").boundingBox();
  expect(box.width).toBeGreaterThan(900);
  const cards = await page.locator("#akademik .g2 > .card").evaluateAll((a) => a.map((e) => e.getBoundingClientRect().width));
  for (const w of cards) expect(w).toBeGreaterThan(400);
});

test("kartu melayang di hero menuju fitur nyata", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const hrefs = await page.locator("#heroSec a.float").evaluateAll((a) => a.map((e) => e.getAttribute("href")));
  expect(hrefs.sort()).toEqual(["#analisa", "#produk", "/ms/studio"].sort());
  for (const h of hrefs.filter((x) => x.startsWith("#"))) await expect(page.locator(h)).toHaveCount(1);
});

test("reduced-motion: konten tampil dan tanpa animasi", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator("h1").first()).toBeVisible();
  const anim = await page.evaluate(() => getComputedStyle(document.querySelector(".float")).animationName);
  expect(anim).toBe("none");
  const op = await page.evaluate(() => getComputedStyle(document.querySelector("h1")).opacity);
  expect(Number(op)).toBe(1);
  await ctx.close();
});
