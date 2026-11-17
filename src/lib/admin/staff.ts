import { redirect } from "next/navigation";
import { staffDb } from "@/lib/supabase/staff";

export type Role = "admin" | "reception" | "animation" | "seasonal";

export type Staff = {
  id: string;
  email: string;
  name: string;
  role: Role;
  aal2: boolean;
};

/** The signed-in staff member, or null. Reads the profile under their own JWT. */
export async function getStaff(): Promise<Staff | null> {
  const db = await staffDb();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return null;
  const [{ data: profile }, { data: aal }] = await Promise.all([
    db.from("profiles").select("display_name, role").eq("id", auth.user.id).maybeSingle(),
    db.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  if (!profile) return null;
  return {
    id: auth.user.id,
    email: auth.user.email ?? "",
    name: profile.display_name,
    role: profile.role,
    aal2: aal?.currentLevel === "aal2",
  };
}

/**
 * For admin pages and actions: a staff member with 2FA and one of `roles`.
 * The UI uses this to hide what a role can't do; RLS enforces it.
 */
export async function requireStaff(...roles: Role[]): Promise<Staff> {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  if (!staff.aal2) redirect("/admin/2fa");
  if (roles.length > 0 && !roles.includes(staff.role)) redirect("/admin?no-access=1");
  return staff;
}

export const roleNames: Record<Role, string> = {
  admin: "Beheerder",
  reception: "Receptie",
  animation: "Animatie",
  seasonal: "Seizoenskracht",
};

/** What each role may do, for the nav and the buttons (RLS has the final say). */
export const can = {
  bookings: (r: Role) => r === "admin" || r === "reception" || r === "seasonal",
  editBookings: (r: Role) => r === "admin" || r === "reception",
  blocks: (r: Role) => r === "admin" || r === "reception",
  events: (r: Role) => r !== "seasonal",
  editEvents: (r: Role) => r === "admin" || r === "reception" || r === "animation",
  messages: (r: Role) => r === "admin" || r === "reception",
  media: (r: Role) => r === "admin" || r === "animation",
  content: (r: Role) => r === "admin",
};
