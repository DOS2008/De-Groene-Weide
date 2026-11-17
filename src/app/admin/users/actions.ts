"use server";

import { requireStaff, type Role } from "@/lib/admin/staff";
import { staffDb } from "@/lib/supabase/staff";
import { serviceDb } from "@/lib/supabase/service";
import { refresh, str } from "@/lib/admin/form";
import { layout } from "@/lib/email/booking";
import { sendMail } from "@/lib/mail";
import { siteUrl } from "@/lib/seo";
import type { FormState } from "../ActionForm";

const ROLES: Role[] = ["admin", "reception", "animation", "seasonal"];

function roleError(message: string) {
  if (message.includes("last_admin")) return "Er moet altijd minstens één beheerder zijn.";
  if (message.includes("row-level security")) return "Dat mag jouw rol niet.";
  return "Er ging iets mis. Probeer het opnieuw.";
}

/**
 * Invites a staff member: creates the account (no password yet), the
 * profile with the role, and mails a link to set a password. 2FA is set up
 * on the first login. The service key is only used after the admin check.
 */
export async function inviteStaff(_: FormState, form: FormData): Promise<FormState> {
  const me = await requireStaff("admin");
  const email = str(form, "email", 200).toLowerCase();
  const name = str(form, "name", 80);
  const role = str(form, "role") as Role;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Dat e-mailadres klopt niet." };
  if (!name) return { error: "Vul een naam in." };
  if (!ROLES.includes(role)) return { error: "Kies een rol." };

  const service = serviceDb();
  const { data, error } = await service.auth.admin.generateLink({ type: "invite", email });
  if (error || !data.user) {
    return { error: error?.message.includes("already") ? "Er is al een account met dit e-mailadres." : "Uitnodigen lukt nu niet." };
  }
  // The profile goes in under the admin's own session, so RLS checks it.
  const db = await staffDb();
  const profile = await db.from("profiles").insert({ id: data.user.id, display_name: name, role });
  if (profile.error) {
    await service.auth.admin.deleteUser(data.user.id);
    return { error: roleError(profile.error.message) };
  }

  const link = `${siteUrl()}/admin/welcome?token=${encodeURIComponent(data.properties.hashed_token)}`;
  try {
    await sendMail({
      to: email,
      subject: "Je account voor het beheer van De Groene Weide",
      ...layout(
        [
          `Hallo ${name},`,
          `${me.name} heeft je uitgenodigd voor het beheer van De Groene Weide.`,
          `Kies hier je wachtwoord (de link werkt 24 uur): ${link}`,
          "Daarna koppel je een app voor inlogcodes op je telefoon, zoals Google Authenticator of Microsoft Authenticator. Zonder die code kom je er niet in: zo blijven de gegevens van gasten veilig.",
          "Tot gauw op het erf!",
        ],
        "nl",
      ),
    });
  } catch (e) {
    console.error("invite mail failed:", e instanceof Error ? e.message : e);
    return { error: "Het account staat klaar, maar de mail kon niet weg. Verwijder het en probeer het opnieuw." };
  }
  refresh();
  return { ok: `Uitnodiging verstuurd naar ${email}.` };
}

export async function changeRole(_: FormState, form: FormData): Promise<FormState> {
  await requireStaff("admin");
  const role = str(form, "role") as Role;
  if (!ROLES.includes(role)) return { error: "Kies een rol." };
  const db = await staffDb();
  const { error, count } = await db.from("profiles").update({ role }, { count: "exact" }).eq("id", str(form, "id"));
  if (error) return { error: roleError(error.message) };
  if (!count) return { error: "Dat mag jouw rol niet." };
  refresh();
  return { ok: "De rol is aangepast. Dat geldt vanaf de volgende keer dat diegene iets opent." };
}

/** Removes the account. The database refuses to remove the last admin. */
export async function revokeStaff(_: FormState, form: FormData): Promise<FormState> {
  const me = await requireStaff("admin");
  const id = str(form, "id");
  if (id === me.id) return { error: "Je kunt jezelf niet verwijderen." };
  // Remove the profile first under the admin's session: RLS and the
  // last-admin guard decide. Then the login itself goes.
  const db = await staffDb();
  const { error, count } = await db.from("profiles").delete({ count: "exact" }).eq("id", id);
  if (error) return { error: roleError(error.message) };
  if (!count) return { error: "Dat mag jouw rol niet." };
  const { error: authError } = await serviceDb().auth.admin.deleteUser(id);
  if (authError) console.error("delete user:", authError.message);
  refresh();
  return { ok: "De toegang is ingetrokken." };
}

/** For a lost phone: the person sets up a new authenticator app on the next login. */
export async function resetTwoFactor(_: FormState, form: FormData): Promise<FormState> {
  const me = await requireStaff("admin");
  const id = str(form, "id");
  if (id === me.id) return { error: "Je eigen 2FA zet een andere beheerder opnieuw in." };
  const db = await staffDb();
  const { data: profile } = await db.from("profiles").select("id").eq("id", id).maybeSingle();
  if (!profile) return { error: "Dat account bestaat niet." };
  const service = serviceDb();
  const { data, error } = await service.auth.admin.mfa.listFactors({ userId: id });
  if (error) return { error: "Dat lukt nu niet." };
  for (const f of data.factors) await service.auth.admin.mfa.deleteFactor({ id: f.id, userId: id });
  await service.auth.admin.signOut(id).catch(() => undefined);
  refresh();
  return { ok: "2FA is gewist. Bij de volgende keer inloggen koppelt diegene een nieuwe app." };
}

/** "Wachtwoord vergeten": mails a link to choose a new password. */
export async function sendPasswordLink(_: FormState, form: FormData): Promise<FormState> {
  await requireStaff("admin");
  const db = await staffDb();
  const { data: rows } = await db.rpc("staff_overview");
  const person = ((rows ?? []) as { id: string; email: string; display_name: string }[]).find((r) => r.id === str(form, "id"));
  if (!person) return { error: "Dat account bestaat niet." };
  const { data, error } = await serviceDb().auth.admin.generateLink({ type: "recovery", email: person.email });
  if (error) return { error: "Dat lukt nu niet." };
  const link = `${siteUrl()}/admin/welcome?type=recovery&token=${encodeURIComponent(data.properties.hashed_token)}`;
  try {
    await sendMail({
      to: person.email,
      subject: "Nieuw wachtwoord voor het beheer van De Groene Weide",
      ...layout([`Hallo ${person.display_name},`, `Kies hier een nieuw wachtwoord (de link werkt 24 uur): ${link}`, "Heb je hier niet om gevraagd? Laat het Bert weten."], "nl"),
    });
  } catch {
    return { error: "De mail kon niet weg. Probeer het later opnieuw." };
  }
  return { ok: `Link voor een nieuw wachtwoord verstuurd naar ${person.email}.` };
}
