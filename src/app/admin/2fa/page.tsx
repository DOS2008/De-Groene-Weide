import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { staffDb } from "@/lib/supabase/staff";
import { CodeForm, SetupForm } from "./TwoFactor";

export const metadata: Metadata = { title: "Tweestapsverificatie" };

/**
 * Second step of the login. Staff without a verified authenticator app
 * must set one up first: there is no way into the panel without 2FA.
 */
export default async function TwoFactorPage() {
  const db = await staffDb();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) redirect("/admin/login");
  const { data: aal } = await db.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === "aal2") redirect("/admin");
  const { data } = await db.auth.mfa.listFactors();
  const factor = data?.totp.find((f) => f.status === "verified");
  return factor ? <CodeForm factorId={factor.id} /> : <SetupForm />;
}
