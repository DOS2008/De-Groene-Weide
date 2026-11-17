import { sendMail } from "@/lib/mail";
import { serviceDb } from "@/lib/supabase/service";

/** Pause before the next try: 5 min, 15 min, 1 h, 4 h, then give up after 6 tries. */
export function nextDelayMinutes(attempts: number): number | null {
  const steps = [5, 15, 60, 240, 240];
  return attempts > steps.length ? null : steps[attempts - 1];
}

/** Retries mails that failed earlier (F4.5). */
export async function retryOutbox(now = new Date()): Promise<{ sent: number; failed: number }> {
  const db = serviceDb();
  const { data, error } = await db
    .from("mail_outbox")
    .select("*")
    .is("sent_at", null)
    .lte("next_attempt_at", now.toISOString())
    .order("next_attempt_at")
    .limit(50);
  if (error) throw new Error(error.message);
  let sent = 0;
  let failed = 0;
  for (const m of data) {
    try {
      await sendMail({ to: m.to_address, replyTo: m.reply_to ?? undefined, subject: m.subject, text: m.body_text, html: m.body_html ?? undefined });
      await db.from("mail_outbox").update({ sent_at: now.toISOString() }).eq("id", m.id);
      sent++;
    } catch (e) {
      failed++;
      const attempts = m.attempts + 1;
      const delay = nextDelayMinutes(attempts);
      await db
        .from("mail_outbox")
        .update({
          attempts,
          last_error: (e instanceof Error ? e.message : String(e)).slice(0, 500),
          // Given up: far in the future, so it isn't picked again; the
          // retention job removes it after 30 days.
          next_attempt_at: new Date(now.getTime() + (delay ?? 60 * 24 * 365) * 60_000).toISOString(),
        })
        .eq("id", m.id);
    }
  }
  return { sent, failed };
}
