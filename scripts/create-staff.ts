/**
 * Creates a staff account (accounts are invite-only, there is no sign-up).
 *
 *   docker compose exec web npm run create-staff -- bert@example.nl "Bert" admin
 *
 * Roles: admin, reception, animation, seasonal. Prints a one-time password;
 * the person sets up 2FA on first login. Later staff are invited from the
 * admin panel (Gebruikers & rollen).
 */
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const [email, name, role = "admin"] = process.argv.slice(2);
const roles = ["admin", "reception", "animation", "seasonal"];
if (!email || !name || !roles.includes(role)) {
  console.error('Usage: npm run create-staff -- <email> "<name>" <admin|reception|animation|seasonal>');
  process.exit(1);
}

const url = process.env.SUPABASE_URL ?? "http://localhost:8000";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) {
  console.error("SUPABASE_SERVICE_ROLE_KEY is not set (run this inside the web container).");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
const password = randomBytes(12).toString("base64url");

const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
if (error || !data.user) {
  console.error("Could not create the account:", error?.message);
  process.exit(1);
}
const profile = await db.from("profiles").insert({ id: data.user.id, display_name: name, role });
if (profile.error) {
  console.error("Account created, but the profile failed:", profile.error.message);
  process.exit(1);
}
console.log(`Created ${role} ${email}. One-time password: ${password}`);
console.log("Log in at /admin/login and set up the authenticator app.");
