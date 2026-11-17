import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { expect, type Page } from "@playwright/test";
import { totp } from "./totp";

/** Service-role client for test setup only (creating and removing staff). */
export function service() {
  return createClient(process.env.SUPABASE_URL ?? "http://localhost:8000", process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

export type TestStaff = { id: string; email: string; password: string };

export async function createStaff(role: "admin" | "reception" | "animation" | "seasonal"): Promise<TestStaff> {
  const db = service();
  const email = `e2e-${role}-${Date.now()}@test.local`;
  const password = randomBytes(12).toString("base64url");
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const p = await db.from("profiles").insert({ id: data.user!.id, display_name: `Test ${role}`, role });
  if (p.error) throw p.error;
  return { id: data.user!.id, email, password };
}

export async function removeStaff(s: TestStaff) {
  await service().auth.admin.deleteUser(s.id);
}

/** Logs in and sets up the authenticator app, like a new staff member. */
export async function loginWithNewTotp(page: Page, s: TestStaff) {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("E-mailadres").fill(s.email);
  await page.getByLabel("Wachtwoord").fill(s.password);
  await page.getByRole("button", { name: "Inloggen" }).click();
  await expect(page.getByRole("heading", { name: "Tweestapsverificatie instellen" })).toBeVisible();
  await page.getByRole("button", { name: "Koppel mijn app" }).click();
  const secret = (await page.getByTestId("totp-secret").textContent())!.trim();
  await page.getByLabel("Code uit je app").fill(totp(secret));
  await page.getByRole("button", { name: "Bevestigen" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /Goede(morgen|middag|navond), Test/ })).toBeVisible();
}
