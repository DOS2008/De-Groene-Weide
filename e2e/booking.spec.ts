import { expect, test } from "@playwright/test";
import { expectMail, randomStay, toPlotStep } from "./helpers";

test("a guest books a plot on a phone, and gets an email @phone", async ({ page }) => {
  const stay = randomStay();
  const email = `gast-${Date.now()}@example.nl`;
  await toPlotStep(page, stay);
  // A guest answers the cookie banner first: on a phone it sits over the bottom sheet.
  await page.getByRole("button", { name: "Alleen nodige" }).click();

  // Pick T12 from the list view (always available next to the map).
  await page.getByRole("button", { name: "Lijst" }).click();
  // The wide table scrolls inside its own box; the page never scrolls sideways.
  const widths = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  expect(widths[0]).toBeLessThanOrEqual(widths[1]);
  await page.getByRole("button", { name: "Bekijk plek T12" }).click();
  await expect(page.getByText(/Nog \d+:\d\d vastgehouden/)).toBeVisible();
  await page.getByRole("button", { name: "Verder naar je gegevens" }).first().click();

  await expect(page.getByRole("heading", { level: 1, name: "Wie mogen we verwachten?" })).toBeVisible();
  await page.getByLabel("Naam").fill("Familie Test");
  await page.getByLabel("E-mailadres").fill(email);
  await page.getByRole("button", { name: "Volgende" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Klopt alles?" })).toBeVisible();
  await page.getByRole("button", { name: "Verstuur aanvraag" }).click();
  await expect(page.getByText("Vink aan dat je de huisregels hebt gelezen.")).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Verstuur aanvraag" }).click();

  await expect(page.getByRole("heading", { level: 1, name: /Je aanvraag is binnen/ })).toBeVisible();
  await expect(page.getByText(/^GW-[0-9A-F]{6}$/)).toBeVisible();
  await expectMail(email, /aanvraag voor plek T12/);
});

test("invalid dates are refused with a clear message", async ({ page }) => {
  await page.goto("/reserveren?aankomst=2029-10-31&vertrek=2029-11-02");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Volgende" }).click();
  await expect(page.getByText("Op 31 oktober sluiten we.")).toBeVisible();

  await page.goto("/reserveren?aankomst=2029-10-28&vertrek=2029-11-02");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Volgende" }).click();
  await expect(page.getByText(/loopt over het einde van het seizoen/)).toBeVisible();

  await page.goto("/reserveren?aankomst=2029-07-10&vertrek=2029-07-08");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Volgende" }).click();
  await expect(page.getByText("Je vertrekdatum moet na je aankomstdatum liggen.")).toBeVisible();
});

test("two browsers pick the same plot at the same time: exactly one wins", async ({ browser }) => {
  const stay = randomStay(2);
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  await Promise.all([toPlotStep(a, stay), toPlotStep(b, stay)]);
  for (const p of [a, b]) await p.getByRole("button", { name: "Lijst" }).click();

  await Promise.all([
    a.getByRole("button", { name: "Bekijk plek T33" }).click(),
    b.getByRole("button", { name: "Bekijk plek T33" }).click(),
  ]);

  const held = (p: typeof a) => p.getByText(/Nog \d+:\d\d vastgehouden/);
  const lost = (p: typeof a) => p.getByText(/Net te laat/);
  await expect(async () => {
    const wins = [await held(a).isVisible(), await held(b).isVisible()].filter(Boolean).length;
    const losses = [await lost(a).isVisible(), await lost(b).isVisible()].filter(Boolean).length;
    expect([wins, losses]).toEqual([1, 1]);
  }).toPass({ timeout: 15_000 });
});

test("the Plattegrond hands the chosen plot over to booking", async ({ page }) => {
  await page.goto("/plattegrond");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: /^Plek C5,/ }).click();
  await expect(page.getByRole("heading", { name: "Plek C5" })).toBeVisible();
  await page.getByRole("link", { name: "Is deze plek vrij? Kies je data" }).click();
  await expect(page).toHaveURL(/plek=C5/);
});

for (const lang of [
  { path: "/en/book", next: "Next", group: "Who's coming?", skip: "Skip, I'll choose myself", map: "Choose your spot in the meadow", list: "List", pick: "View pitch T18", held: /Held for another \d+:\d\d/, toDetails: "Continue to your details", name: "Name", email: "Email address", rules: "Send request", done: /Your request is in/, subject: /request for pitch T18/ },
  { path: "/de/buchen", next: "Weiter", group: "Mit wem kommst du?", skip: "Überspringen, ich wähle selbst", map: "Such dir dein Plätzchen auf der Wiese aus", list: "Liste", pick: "Platz T18 ansehen", held: /Noch \d+:\d\d festgehalten/, toDetails: "Weiter zu deinen Angaben", name: "Name", email: "E-Mail-Adresse", rules: "Anfrage senden", done: /Deine Anfrage ist da/, subject: /Anfrage für Platz T18/ },
]) {
  test(`the booking flow and email work in ${lang.path.slice(1, 3).toUpperCase()}`, async ({ page }) => {
    const stay = randomStay();
    const email = `guest-${lang.path.slice(1, 3)}-${Date.now()}@example.com`;
    await page.goto(`${lang.path}?aankomst=${stay.arrival}&vertrek=${stay.departure}`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("html")).toHaveAttribute("lang", lang.path.slice(1, 3));
    await page.getByRole("button", { name: lang.next, exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: lang.group })).toBeVisible();
    await page.getByRole("button", { name: lang.next, exact: true }).click();
    await page.getByRole("button", { name: lang.skip }).click();
    await expect(page.getByRole("heading", { level: 1, name: lang.map })).toBeVisible();
    await page.getByRole("button", { name: lang.list }).click();
    await page.getByRole("button", { name: lang.pick }).click();
    // Wait for the hold: before it lands, "continue" only asks you to pick a plot.
    await expect(page.getByText(lang.held)).toBeVisible();
    await page.getByRole("button", { name: lang.toDetails }).first().click();
    await page.getByLabel(lang.name, { exact: true }).fill("Test Family");
    await page.getByLabel(lang.email).fill(email);
    await page.getByRole("button", { name: lang.next, exact: true }).click();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: lang.rules }).click();
    await expect(page.getByRole("heading", { level: 1, name: lang.done })).toBeVisible();
    await expectMail(email, lang.subject);
  });
}

test("Plekmatch asks five questions and tips three free plots, shown as stars", async ({ page }) => {
  const stay = randomStay();
  await page.goto(`/reserveren?aankomst=${stay.arrival}&vertrek=${stay.departure}`);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Volgende", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Met wie kom je?" })).toBeVisible();
  await page.getByRole("button", { name: "Volgende", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Welke plek past bij jou?" })).toBeVisible();

  for (const [question, answer] of [
    ["Waar wil je graag dichtbij zijn?", "De speelweide"],
    ["Rust of reuring?", "Lekker rustig"],
    ["Hoeveel schaduw wil je?", "Veel schaduw"],
    ["Moet de plek vlak zijn?", "Ja, graag vlak"],
    ["Heeft iemand een rolstoel of rollator nodig?", "Nee"],
  ]) {
    await expect(page.getByRole("heading", { level: 2, name: question })).toBeFocused();
    await page.getByRole("button", { name: answer, exact: true }).click();
  }
  await expect(page.getByRole("heading", { level: 2, name: "De kip tipt deze 3 plekken" })).toBeFocused();
  const picks = page.getByRole("button", { name: /^Kies plek [TCS]\d+$/ });
  await expect(picks).toHaveCount(3);
  const first = (await picks.first().textContent())!.replace("Kies plek ", "");
  await picks.first().click();

  await expect(page.getByRole("heading", { level: 1, name: "Kies je plekje in de wei" })).toBeVisible();
  await expect(page.getByText(/Nog \d+:\d\d vastgehouden/)).toBeVisible();
  await page.getByRole("button", { name: "Lijst" }).click();
  await expect(page.getByRole("button", { name: `Bekijk plek ${first}` })).toBeVisible();
});

test("Plekmatch never tips an unchecked plot as wheelchair accessible", async ({ page }) => {
  const stay = randomStay();
  await page.goto(`/reserveren?aankomst=${stay.arrival}&vertrek=${stay.departure}`);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Volgende", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Met wie kom je?" })).toBeVisible();
  await page.getByRole("button", { name: "Volgende", exact: true }).click();
  for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Maakt niet uit", exact: true }).click();
  await page.getByRole("button", { name: "Ja", exact: true }).click();
  // Until the walk-through every plot is unchecked, so none counts as accessible.
  await expect(page.getByRole("heading", { level: 2, name: "Precies wat je zoekt is niet meer vrij" })).toBeVisible();
  await expect(page.getByText("Let op: die plek is niet gecontroleerd op rolstoeltoegang.")).toBeVisible();
  await expect(page.getByText(/Een plek die precies past, hebben we \(nog\) niet/)).toBeVisible();
});
