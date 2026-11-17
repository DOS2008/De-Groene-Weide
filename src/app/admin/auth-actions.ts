"use server";

import { redirect } from "next/navigation";
import { staffDb } from "@/lib/supabase/staff";
import { createRateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

export type AuthState = { error?: string; qr?: string; secret?: string; factorId?: string };

const loginLimit = createRateLimit({ limit: 10, windowMs: 15 * 60_000 });

async function ip() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || "local";
}

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  if (!loginLimit(await ip())) return { error: "Te veel pogingen. Wacht een kwartier en probeer het opnieuw." };
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Vul je e-mailadres en wachtwoord in." };
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
  if (!loginLimit(await ip())) return { error: "Te veel pogingen. Wacht een kwartier en probeer het opnieuw." };
  const code = String(form.get("code") ?? "").replace(/\s/g, "");
  const factorId = String(form.get("factorId") ?? "");
  if (!/^\d{6}$/.test(code)) return { error: "Vul de 6 cijfers uit je app in.", factorId };
  const db = await staffDb();
  const { error } = await db.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) return { error: "Die code klopt niet of is verlopen. Probeer de nieuwe code.", factorId };
  redirect("/admin");
}

export async function signOut() {
  const db = await staffDb();
  await db.auth.signOut();
  redirect("/admin/login");
}

