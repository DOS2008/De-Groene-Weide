"use server";

import { redirect } from "next/navigation";
import { staffDb } from "@/lib/supabase/staff";
import { createRateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

export type AuthState = { error?: string; qr?: string; secret?: string; factorId?: string };

// Guessing is limited per account (10 tries per quarter), with a looser cap
// per address so one office or campsite wifi can still log in several people.
const accountLimit = createRateLimit({ limit: 10, windowMs: 15 * 60_000 });
const addressLimit = createRateLimit({ limit: 60, windowMs: 15 * 60_000 });
const codeLimit = createRateLimit({ limit: 10, windowMs: 15 * 60_000 });
const TOO_MANY = "Te veel pogingen. Wacht een kwartier en probeer het opnieuw.";

async function ip() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || "local";
}

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Vul je e-mailadres en wachtwoord in." };
  if (!addressLimit(await ip()) || !accountLimit(email.toLowerCase())) return { error: TOO_MANY };
  const db = await staffDb();
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) return { error: "Dat e-mailadres of wachtwoord klopt niet." };
  redirect("/admin/2fa");
}

/**
 * Starts TOTP setup for a staff member without a verified factor. Old,
 * unfinished setups are removed first, so a reload never piles them up.
 */
export async function startSetup(): Promise<AuthState> {
  const db = await staffDb();
  const { data: list } = await db.auth.mfa.listFactors();
  for (const f of list?.all ?? []) {
    if (f.status !== "verified") await db.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await db.auth.mfa.enroll({ factorType: "totp", friendlyName: `Telefoon ${Date.now()}` });
  if (error || !data) return { error: "Instellen lukt nu niet. Probeer het opnieuw." };
  return { qr: data.totp.qr_code, secret: data.totp.secret, factorId: data.id };
}

export async function verifyCode(_: AuthState, form: FormData): Promise<AuthState> {
  const code = String(form.get("code") ?? "").replace(/\s/g, "");
  const factorId = String(form.get("factorId") ?? "");
  if (!/^\d{6}$/.test(code)) return { error: "Vul de 6 cijfers uit je app in.", factorId };
  const db = await staffDb();
  const { data: who } = await db.auth.getUser();
  if (!addressLimit(await ip()) || !codeLimit(who.user?.id ?? "none")) return { error: TOO_MANY, factorId };
  const { error } = await db.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) return { error: "Die code klopt niet of is verlopen. Probeer de nieuwe code.", factorId };
  redirect("/admin");
}

export async function signOut() {
  const db = await staffDb();
  await db.auth.signOut();
  redirect("/admin/login");
}

