"use server";

import { redirect } from "next/navigation";
import { staffDb } from "@/lib/supabase/staff";

export type WelcomeState = { error?: string };

/** Uses the one-time link from the invite (or a new-password mail) and sets the password. */
export async function setPassword(_: WelcomeState, form: FormData): Promise<WelcomeState> {
  const token = String(form.get("token") ?? "");
  const type = form.get("type") === "recovery" ? "recovery" : "invite";
  const password = String(form.get("password") ?? "");
  if (password.length < 12) return { error: "Kies een wachtwoord van minstens 12 tekens. Een zinnetje werkt goed." };
  if (password !== String(form.get("repeat") ?? "")) return { error: "De twee wachtwoorden zijn niet gelijk." };
  const db = await staffDb();
  const { error } = await db.auth.verifyOtp({ token_hash: token, type });
  if (error) return { error: "Deze link is verlopen of al gebruikt. Vraag Bert om een nieuwe." };
  const { error: pwError } = await db.auth.updateUser({ password });
  if (pwError) return { error: "Dat wachtwoord wordt niet geaccepteerd. Kies een ander." };
  redirect("/admin/2fa");
}
