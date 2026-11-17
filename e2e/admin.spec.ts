import { expect, test } from "@playwright/test";
import { randomStay, toPlotStep } from "./helpers";
import { createStaff, loginWithNewTotp, removeStaff } from "./staff";

test("without 2FA no admin page opens", async ({ page }) => {
  await page.goto("/admin/bookings");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("reception enters a phone booking; the plot is taken on the site at once", async ({ page, browser }) => {
  const staff = await createStaff("reception");
  try {
    await loginWithNewTotp(page, staff);
    const stay = randomStay(2);

    await page.goto("/admin/bookings/new");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Aankomst").fill(stay.arrival);
    await page.getByLabel("Vertrek").fill(stay.departure);
    await page.getByRole("button", { name: "Lijst" }).click();
    await page.getByRole("button", { name: "Bekijk plek T27" }).click();
    await page.getByLabel("Naam").fill("Telefoongast");
    await page.getByLabel("Telefoon").fill("0612345678");
    await page.getByRole("button", { name: "Boek plek T27" }).click();
    await expect(page.getByText(/Geboekt: GW-[0-9A-F]{6}, plek T27/)).toBeVisible();

    // A guest looking at the same dates sees T27 as taken.
    const guest = await (await browser.newContext()).newPage();
    await toPlotStep(guest, stay);
    await expect(guest.getByRole("button", { name: "Plek T27, bezet" })).toBeDisabled();
  } finally {
    await removeStaff(staff);
  }
});
