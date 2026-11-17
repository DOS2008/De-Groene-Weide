import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const pages = [
  "/",
  "/terrein-en-activiteiten",
  "/plattegrond",
  "/reserveren",
  "/evenementen",
  "/over-ons",
  "/contact",
  "/toegankelijkheid",
  "/huisregels-en-faq",
  "/privacy-en-cookies",
  "/deze-pagina-bestaat-niet",
];

for (const path of pages) {
  test(`no serious accessibility issues on ${path} @phone`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    // @axe-core/playwright brings its own playwright-core types; the page is the same at runtime.
    const result = await new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]["page"] }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    const serious = result.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`)).toEqual([]);
  });
}

// WCAG 1.4.10 Reflow: at 320 CSS pixels wide (the same as 400 % zoom on a
// 1280 px screen) nothing may make the page scroll sideways.
test("no page scrolls sideways at 320 px wide", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 640 } });
  const page = await context.newPage();
  const wide: string[] = [];
  for (const path of [...pages, "/en/book", "/de/buchen", "/mijn-reservering/onbekend"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const [scroll, client] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    if (scroll > client) wide.push(`${path}: ${scroll}px`);
  }
  expect(wide).toEqual([]);
  await context.close();
});
