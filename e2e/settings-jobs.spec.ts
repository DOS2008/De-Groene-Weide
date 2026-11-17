import { expect, test } from "@playwright/test";
import { mailText } from "./helpers";
import { service } from "./staff";

/*
 * The reminder mail (F7.2) through the jobs endpoint, the way the cron
 * service calls it. Runs in the "settings" project because it changes the
 * reminder setting for a moment.
 */
test("the jobs endpoint sends the reminder once, with the manage link", async ({ request }) => {
  const db = service();
  const email = `herinnering-${Date.now()}@example.nl`;
  const { data: before } = await db.from("settings").select("value").eq("key", "reminder_days_before").single();
  // The test runs outside the season, so look far ahead.
  await db.from("settings").update({ value: 400 }).eq("key", "reminder_days_before");
  let id: string | undefined;
  try {
    for (let i = 0; i < 20 && !id; i++) {
      const day = 1 + Math.floor(Math.random() * 25);
      const arrival = `2027-05-${String(day).padStart(2, "0")}`;
      const departure = `2027-05-${String(day + 2).padStart(2, "0")}`;
      const { data } = await db
        .from("reservations")
        .insert({
          plot_id: `S${1 + Math.floor(Math.random() * 8)}`,
          stay: `[${arrival},${departure})`,
          status: "confirmed",
          source: "phone",
          name: "Familie Herinnering",
          adults: 2,
          email,
          locale: "en",
        })
        .select("id")
        .maybeSingle();
      id = data?.id;
    }
    expect(id, "a free test booking").toBeTruthy();

    const call = () =>
      request.post("/api/jobs", { headers: { Authorization: `Bearer ${process.env.JOBS_SECRET}` } });
    expect((await request.post("/api/jobs")).status(), "no secret, no jobs").toBe(403);
    const first = await call();
    expect(first.ok()).toBe(true);

    const text = await mailText(email, /days to go|De Groene Weide/);
    expect(text).toContain("Hello Familie Herinnering");
    expect(text).toMatch(/\/en\/my-booking\/[0-9a-f]{48}/);

    // A second run sends nothing new to this guest.
    await call();
    const res = await fetch(`${process.env.MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
    expect(((await res.json()) as { messages: unknown[] }).messages).toHaveLength(1);
  } finally {
    if (id) await db.from("reservations").delete().eq("id", id);
    await db.from("settings").update({ value: before?.value ?? 3 }).eq("key", "reminder_days_before");
  }
});
