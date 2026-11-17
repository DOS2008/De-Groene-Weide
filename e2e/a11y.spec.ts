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
