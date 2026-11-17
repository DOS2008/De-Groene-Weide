import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { expectMail, randomStay, toPlotStep } from "./helpers";
import { createStaff, loginWithNewTotp, removeStaff, service } from "./staff";

/*
 * The four test tasks from the plan (Prio 5, "Done when"): post an event,
 * block a plot, enter a phone booking (admin.spec.ts) and change a price.
 * Plus the inbox, role limits and axe on every admin screen.
 */

test("animation posts an event; guests see it on the events page", async ({ page, browser }) => {
  const staff = await createStaff("animation");
  const title = `Kippenrace ${Date.now()}`;
  const date = randomStay(1).arrival;
  try {
    await loginWithNewTotp(page, staff);
    await page.goto("/admin/events/new");
    await page.getByLabel("Titel Nederlands").fill(title);
    await page.getByLabel("Hoe vaak").selectOption("once");
    await page.getByLabel("Datum").fill(date);
    await page.getByLabel("Begintijd").fill("15:30");
    await page.getByLabel("Gepubliceerd (op de website)").check();
    await page.getByRole("button", { name: "Evenement aanmaken" }).click();
    await expect(page.getByText("Het evenement is aangemaakt.")).toBeVisible();

    const guest = await (await browser.newContext()).newPage();
    await expect(async () => {
      await guest.goto(`/evenementen?view=day&date=${date}`);
      await expect(guest.getByText(title)).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 30_000 });
  } finally {
    await service().from("events").delete().like("title_nl", "Kippenrace %");
    await removeStaff(staff);
  }
});

test("reception blocks a plot; guests see it as blocked", async ({ page, browser }) => {
  const staff = await createStaff("reception");
  const stay = randomStay(2);
  try {
    await loginWithNewTotp(page, staff);
    await page.goto("/admin/plots");
    await page.getByLabel("Plek", { exact: true }).selectOption("T33");
    await page.getByLabel("Eerste nacht").fill(stay.arrival);
    await page.getByLabel("Laatste nacht").fill(stay.arrival);
    await page.getByLabel("Reden").fill("Te nat");
    await page.getByRole("button", { name: "Blokkeer" }).click();
    await expect(page.getByText("Plek T33 is geblokkeerd.")).toBeVisible();

    const guest = await (await browser.newContext()).newPage();
    await toPlotStep(guest, stay);
    await expect(guest.getByRole("button", { name: "Plek T33, geblokkeerd" })).toBeDisabled();
  } finally {
    await service().from("plot_blocks").delete().eq("plot_id", "T33").eq("reason", "Te nat");
    await removeStaff(staff);
  }
});

test("Bert changes a price; the booking page shows it", async ({ page, browser }) => {
  const staff = await createStaff("admin");
  const db = service();
  const { data: before } = await db
    .from("prices")
    .select("price_per_night")
    .eq("price_group_id", "safari_tent")
    .eq("period_id", "low")
    .single();
  try {
    await loginWithNewTotp(page, staff);
    await page.goto("/admin/prices");
    await page.getByLabel("Safaritent, Voor- en naseizoen").fill("87,50");
    await page.getByRole("button", { name: "Prijzen opslaan" }).click();
    await expect(page.getByText(/De prijzen zijn opgeslagen/)).toBeVisible();

    // Other visitors may get the old page once while the cache refreshes.
    const guest = await (await browser.newContext()).newPage();
    await expect(async () => {
      await guest.goto("/reserveren");
      await expect(guest.getByText(/87,50/).first()).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 30_000 });
  } finally {
    await db
      .from("prices")
      .update({ price_per_night: before?.price_per_night ?? null })
      .eq("price_group_id", "safari_tent")
      .eq("period_id", "low");
    await removeStaff(staff);
  }
});

test("Bert puts an old price back from the history", async ({ page }) => {
  const staff = await createStaff("admin");
  const db = service();
  const { data: before } = await db.from("prices").select("price_per_night").eq("price_group_id", "camper").eq("period_id", "peak").single();
  try {
    await loginWithNewTotp(page, staff);
    await page.goto("/admin/prices");
    await page.getByLabel("Camper, Hoogseizoen (juli en augustus)").fill("44,00");
    await page.getByRole("button", { name: "Prijzen opslaan" }).click();
    await expect(page.getByText(/De prijzen zijn opgeslagen/)).toBeVisible();

    await page.goto("/admin/history?toon=prijzen");
    const entry = page.getByRole("listitem").filter({ hasText: "Prijs camper:peak gewijzigd door Test admin" }).first();
    await expect(entry).toBeVisible();
    page.once("dialog", (d) => d.accept());
    await entry.getByRole("button", { name: /Zet terug/ }).click();
    await expect(page.getByText(/Teruggezet/)).toBeVisible();
    const { data: after } = await db.from("prices").select("price_per_night").eq("price_group_id", "camper").eq("period_id", "peak").single();
    expect(after?.price_per_night ?? null).toBe(before?.price_per_night ?? null);
  } finally {
    await db.from("prices").update({ price_per_night: before?.price_per_night ?? null }).eq("price_group_id", "camper").eq("period_id", "peak");
    await removeStaff(staff);
  }
});

test("a contact message lands in the inbox and the reply reaches the guest", async ({ page, browser }) => {
  const guestEmail = `gast-${Date.now()}@example.nl`;
  const guest = await (await browser.newContext()).newPage();
  await guest.goto("/contact");
  await guest.waitForLoadState("networkidle");
  // The spam check wants a few seconds between showing and sending the form.
  await guest.waitForTimeout(3500);
  await guest.getByLabel("Naam", { exact: true }).fill("Marit");
  await guest.getByLabel("E-mailadres").fill(guestEmail);
  await guest.getByLabel("Je bericht").fill("Mogen we onze kippen meenemen?");
  await guest.getByRole("button", { name: "Verstuur je bericht" }).click();
  await expect(guest.getByText("Verstuurd!")).toBeVisible();

  const staff = await createStaff("reception");
  try {
    await loginWithNewTotp(page, staff);
    await page.goto("/admin/messages");
    const card = page.getByRole("article").filter({ hasText: guestEmail });
    await expect(card.getByText("Mogen we onze kippen meenemen?")).toBeVisible();
    await card.getByLabel("Antwoord aan Marit").fill("Liever niet, onze haan is jaloers.");
    await card.getByRole("button", { name: "Antwoord versturen" }).click();
    await expect(page.getByText(`Verstuurd naar ${guestEmail}.`)).toBeVisible();
    await page.getByRole("link", { name: "Afgehandeld" }).click();
    await expect(page.getByText("Liever niet, onze haan is jaloers.")).toBeVisible();
    await expectMail(guestEmail, /Antwoord van De Groene Weide/);
  } finally {
    await service().from("messages").delete().eq("email", guestEmail);
    await removeStaff(staff);
  }
});

test("a seasonal worker can't open the settings", async ({ page }) => {
  const staff = await createStaff("seasonal");
  try {
    await loginWithNewTotp(page, staff);
    await page.goto("/admin/settings");
    await expect(page).toHaveURL(/no-access=1/);
    await expect(page.getByText("Dat onderdeel is niet voor jouw rol.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Instellingen" })).toHaveCount(0);
  } finally {
    await removeStaff(staff);
  }
});

const adminPages = [
  "/admin",
  "/admin/bookings",
  "/admin/bookings/calendar",
  "/admin/plots",
  "/admin/plots/T1",
  "/admin/events",
  "/admin/events?weergave=week",
  "/admin/events/new",
  "/admin/settings",
  "/admin/messages",
  "/admin/facilities",
  "/admin/facilities/pool",
  "/admin/prices",
  "/admin/pages",
  "/admin/pages?pagina=about",
  "/admin/media",
  "/admin/users",
  "/admin/history",
];

async function axe(page: Page) {
  const result = await new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]["page"] })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  return result.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`);
}

test("no serious accessibility issues on the admin screens", async ({ page }) => {
  test.setTimeout(300_000);
  const staff = await createStaff("admin");
  try {
    await loginWithNewTotp(page, staff);
    const problems: string[] = [];
    for (const path of adminPages) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBeLessThan(400);
      await page.waitForLoadState("networkidle");
      for (const p of await axe(page)) problems.push(`${path} → ${p}`);
    }
    // Reflow (WCAG 1.4.10): the panel works on a phone, tables scroll in their own box.
    await page.setViewportSize({ width: 320, height: 640 });
    for (const path of adminPages) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const [scroll, client] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      if (scroll > client) problems.push(`${path} → ${scroll}px wide at 320px`);
    }
    expect(problems).toEqual([]);
  } finally {
    await removeStaff(staff);
  }
});
