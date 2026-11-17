import { expect, test } from "@playwright/test";
import { mailText, randomStay, toPlotStep } from "./helpers";
import { createStaff, loginWithNewTotp, removeStaff, service } from "./staff";

/*
 * Booking level 2 (Prio 6): Bert switches it on in the settings, a guest's
 * booking is confirmed at once with an automatic mail, and the guest
 * cancels through the manage link in that mail. Runs in the "settings"
 * project, after every other test, because it changes a site-wide setting.
 */
test("level 2 confirms at once; the guest cancels through the link in the mail", async ({ page, browser }) => {
  const staff = await createStaff("admin");
  const email = `direct-${Date.now()}@example.nl`;
  try {
    await loginWithNewTotp(page, staff);
    await page.goto("/admin/settings");
    await page.getByLabel("Niveau 2: direct bevestigd, de gast krijgt meteen een mail").check();
    await page.getByRole("button", { name: "Opslaan", exact: true }).first().click();
    await expect(page.getByText(/Niveau 2: boekingen zijn meteen bevestigd/)).toBeVisible();

    const guest = await (await browser.newContext()).newPage();
    const stay = randomStay(3);
    await toPlotStep(guest, stay);
    await guest.getByRole("button", { name: "Lijst" }).click();
    await guest.getByRole("button", { name: "Bekijk plek T9" }).click();
    await expect(guest.getByText(/Nog \d+:\d\d vastgehouden/)).toBeVisible();
    await guest.getByRole("button", { name: "Verder naar je gegevens" }).first().click();
    await guest.getByLabel("Naam").fill("Familie Direct");
    await guest.getByLabel("E-mailadres").fill(email);
    await guest.getByRole("button", { name: "Volgende" }).click();
    await guest.getByRole("checkbox").check();
    // Another visitor may see the old button text once while the cache refreshes.
    await guest.getByRole("button", { name: /Boek deze plek|Verstuur aanvraag/ }).click();
    await expect(guest.getByRole("heading", { level: 1, name: "Tok! Je plek is geboekt" })).toBeVisible();

    const text = await mailText(email, /Je plek T9 is bevestigd/);
    const link = /https?:\/\/\S+(\/mijn-reservering\/[0-9a-f]{48})/.exec(text);
    expect(link, "the confirmation mail has a manage link").not.toBeNull();

    await guest.goto(link![1]);
    await expect(guest.getByRole("heading", { level: 1, name: /Je reservering GW-/ })).toBeVisible();
    await expect(guest.getByText("Bevestigd")).toBeVisible();
    await guest.getByRole("checkbox").check();
    await guest.getByRole("button", { name: "Annuleer mijn reservering" }).click();
    await expect(guest.getByText(/Je reservering is geannuleerd/)).toBeVisible();
    await mailText(email, /is geannuleerd/);

    // The plot is free again for the same dates.
    const other = await (await browser.newContext()).newPage();
    await toPlotStep(other, stay);
    await expect(other.getByRole("button", { name: "Plek T9, vrij" })).toBeEnabled();
  } finally {
    await service().from("settings").update({ value: 1 }).eq("key", "booking_level");
    await removeStaff(staff);
  }
});
