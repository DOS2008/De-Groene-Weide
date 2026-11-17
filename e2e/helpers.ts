import { expect, type Page } from "@playwright/test";

/** A random stay far in the future, so runs never collide with each other. */
export function randomStay(nights = 3) {
  const year = 2028 + Math.floor(Math.random() * 3);
  const start = new Date(Date.UTC(year, 4, 1 + Math.floor(Math.random() * 100)));
  const end = new Date(start.getTime() + nights * 86_400_000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { arrival: iso(start), departure: iso(end) };
}

export const mailpit = process.env.MAILPIT_URL ?? "http://localhost:8025";

/** Waits until Mailpit has a message for `to` whose subject matches. */
export async function expectMail(to: string, subject: RegExp) {
  await expect
    .poll(
      async () => {
        const res = await fetch(`${mailpit}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`);
        const data = (await res.json()) as { messages: { Subject: string }[] };
        return data.messages.some((m) => subject.test(m.Subject));
      },
      { timeout: 20_000 },
    )
    .toBe(true);
}

/** Steps 1–3 of the booking flow, ending on the map (step 4). */
export async function toPlotStep(page: Page, stay: { arrival: string; departure: string }, query = "") {
  await page.goto(`/reserveren?aankomst=${stay.arrival}&vertrek=${stay.departure}${query}`);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Volgende" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Met wie kom je?" })).toBeVisible();
  await page.getByRole("button", { name: "Volgende" }).click();
  await page.getByRole("button", { name: "Kies zelf op de kaart" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Kies je plekje in de wei" })).toBeVisible();
}

/** The plain text of the newest mail for `to` whose subject matches. */
export async function mailText(to: string, subject: RegExp): Promise<string> {
  await expectMail(to, subject);
  const res = await fetch(`${mailpit}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`);
  const data = (await res.json()) as { messages: { ID: string; Subject: string }[] };
  const hit = data.messages.find((m) => subject.test(m.Subject))!;
  const msg = (await (await fetch(`${mailpit}/api/v1/message/${hit.ID}`)).json()) as { Text: string };
  return msg.Text;
}
