/**
 * Creates a staff account (accounts are invite-only, there is no sign-up).
 *
 *   development:  docker compose exec web npm run create-staff -- bert@example.nl "Bert" admin
 *   server:       docker compose -f compose.prod.yaml run --rm --no-deps \
 *                   -v ./scripts/create-staff.ts:/app/create-staff.ts:ro \
 *                   web node create-staff.ts bert@example.nl "Bert" admin
 *
 * Roles: admin, reception, animation, seasonal. Prints a one-time password;
 * the person sets up 2FA on first login. Later staff are invited from the
 * admin panel (Gebruikers & rollen).
 *
 * Plain fetch, no packages: the production image has no node_modules for
 * scripts, and Node runs this TypeScript file directly.
 */
import { randomBytes } from "node:crypto";

const [email, name, role = "admin"] = process.argv.slice(2);
const roles = ["admin", "reception", "animation", "seasonal"];
if (!email || !name || !roles.includes(role)) {
  console.error('Usage: create-staff <email> "<name>" <admin|reception|animation|seasonal>');
  process.exit(1);
}

const url = process.env.SUPABASE_URL ?? "http://localhost:8000";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) {
  console.error("SUPABASE_SERVICE_ROLE_KEY is not set (run this inside the web container).");
  process.exit(1);
}

const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
const password = randomBytes(12).toString("base64url");

// No top-level await: without "type": "module" in package.json, tsx compiles
// this file as CommonJS, which does not allow it.
async function main() {
  const created = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const user = (await created.json()) as { id?: string; msg?: string; message?: string };
  if (!created.ok || !user.id) {
    console.error("Could not create the account:", user.msg ?? user.message ?? created.status);
    process.exit(1);
  }

  const profile = await fetch(`${url}/rest/v1/profiles`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({ id: user.id, display_name: name, role }),
  });
  if (!profile.ok) {
    console.error("Account created, but the profile failed:", await profile.text());
    process.exit(1);
  }

  console.log(`Created ${role} ${email}. One-time password: ${password}`);
  console.log("Log in at /admin/login and set up the authenticator app.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
