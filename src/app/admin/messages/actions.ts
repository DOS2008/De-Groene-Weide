"use server";

import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/admin/staff";
import { staffDb } from "@/lib/supabase/staff";
import { dbErrorText } from "@/lib/admin/bookings";
import { refresh, str } from "@/lib/admin/form";
import { layout } from "@/lib/email/booking";
import { contactRecipient, sendMail } from "@/lib/mail";
import type { FormState } from "../ActionForm";

const subjects: Record<string, string> = {
  nl: "Antwoord van De Groene Weide",
  en: "Reply from De Groene Weide",
  de: "Antwort von De Groene Weide",
};
const quoted: Record<string, string> = { nl: "Je schreef:", en: "You wrote:", de: "Du hast geschrieben:" };

export async function setMessageStatus(_: FormState, form: FormData): Promise<FormState> {
  const staff = await requireStaff("admin", "reception");
  const done = str(form, "status") === "done";
  const db = await staffDb();
  const { error, count } = await db
    .from("messages")
    .update(
      done ? { status: "done", handled_at: new Date().toISOString(), handled_by: staff.id } : { status: "new", handled_at: null, handled_by: null },
      { count: "exact" },
    )
    .eq("id", str(form, "id"));
  if (error) return { error: dbErrorText(error.message) };
  if (!count) return { error: "Dat mag jouw rol niet." };
  refresh();
  // The message moves to the other tab, so the note goes on the page itself.
  redirect(done ? "/admin/messages?klaar=1" : "/admin/messages?toon=afgehandeld&terug=1");
}

/** Sends the reply by email (reply-to: Bert's inbox) and marks the message done. */
export async function replyMessage(_: FormState, form: FormData): Promise<FormState> {
  const staff = await requireStaff("admin", "reception");
  const reply = str(form, "reply", 5000);
  if (reply.length < 2) return { error: "Schrijf eerst je antwoord." };
  const db = await staffDb();
  const { data: msg } = await db.from("messages").select("*").eq("id", str(form, "id")).maybeSingle();
  if (!msg) return { error: "Dat bericht bestaat niet meer, of dat mag jouw rol niet." };

  const locale = (msg.locale as string) in subjects ? (msg.locale as string) : "nl";
  try {
    await sendMail({
      to: msg.email,
      replyTo: contactRecipient(),
      subject: msg.subject ? `Re: ${msg.subject}` : subjects[locale],
      ...layout([reply, `${quoted[locale]}\n${msg.body}`], locale as "nl"),
    });
  } catch (e) {
    console.error("reply failed:", e instanceof Error ? e.message : e);
    return { error: "De mail kon niet worden verstuurd. Probeer het later opnieuw." };
  }

  const now = new Date().toISOString();
  const { error } = await db
    .from("messages")
    .update({ reply_text: reply, replied_at: now, status: "done", handled_at: now, handled_by: staff.id })
    .eq("id", msg.id);
  if (error) return { error: dbErrorText(error.message) };
  refresh();
  redirect(`/admin/messages?verstuurd=${encodeURIComponent(msg.email)}`);
}

export async function deleteMessage(_: FormState, form: FormData): Promise<FormState> {
  await requireStaff("admin");
  const db = await staffDb();
  const { error, count } = await db.from("messages").delete({ count: "exact" }).eq("id", str(form, "id"));
  if (error) return { error: dbErrorText(error.message) };
  if (!count) return { error: "Dat mag jouw rol niet." };
  refresh();
  return { ok: "Het bericht is verwijderd." };
}
