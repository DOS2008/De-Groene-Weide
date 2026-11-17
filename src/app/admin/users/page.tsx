import type { Metadata } from "next";
import { requireStaff, roleNames, type Role } from "@/lib/admin/staff";
import { staffDb } from "@/lib/supabase/staff";
import { TableWrap } from "@/components/TableWrap";
import { ActionForm, Submit } from "../ActionForm";
import { changeRole, inviteStaff, resetTwoFactor, revokeStaff, sendPasswordLink } from "./actions";

export const metadata: Metadata = { title: "Gebruikers & rollen" };

const roleHelp: Record<Role, string> = {
  admin: "alles, ook prijzen, teksten en gebruikers",
  reception: "reserveringen, berichten, evenementen, plekken blokkeren",
  animation: "evenementen en foto's",
  seasonal: "alleen kijken",
};

type StaffRow = { id: string; email: string; display_name: string; role: Role; has_2fa: boolean; last_sign_in_at: string | null };

export default async function UsersPage() {
  const me = await requireStaff("admin");
  const db = await staffDb();
  const { data, error } = await db.rpc("staff_overview");
  const rows = (data ?? []) as StaffRow[];

  return (
    <>
      <div className="admin-head">
        <div>
          <span className="eyebrow">Gebruikers & rollen</span>
          <h1>Gebruikers & rollen</h1>
        </div>
      </div>

      <section className="admin-card" aria-labelledby="invite-title">
        <h2 id="invite-title">Iemand uitnodigen</h2>
        <p className="admin-hint">Diegene krijgt een mail om een wachtwoord te kiezen en koppelt daarna een app voor inlogcodes.</p>
        <ActionForm action={inviteStaff} className="admin-form">
          <div className="admin-fields">
            <div className="admin-field">
              <label htmlFor="inv-name">Naam</label>
              <input id="inv-name" name="name" required maxLength={80} />
            </div>
            <div className="admin-field">
              <label htmlFor="inv-email">E-mailadres</label>
              <input id="inv-email" name="email" type="email" required />
            </div>
            <div className="admin-field">
              <label htmlFor="inv-role">Rol</label>
              <select id="inv-role" name="role" defaultValue="reception">
                {(Object.keys(roleNames) as Role[]).map((r) => (
                  <option key={r} value={r}>
                    {roleNames[r]} – {roleHelp[r]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Submit>Uitnodiging versturen</Submit>
          </div>
        </ActionForm>
      </section>

      <section className="admin-card" aria-labelledby="staff-title">
        <h2 id="staff-title">Wie heeft toegang</h2>
        {error && <p className="admin-error">De lijst kon niet laden.</p>}
        <TableWrap label="Gebruikers">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Naam</th>
                <th scope="col">Rol</th>
                <th scope="col">2FA</th>
                <th scope="col">Laatst ingelogd</th>
                <th scope="col">
                  <span className="visually-hidden">Acties</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <th scope="row">
                    {u.display_name}
                    {u.id === me.id && " (jij)"}
                    <br />
                    <span className="admin-hint">{u.email}</span>
                  </th>
                  <td>
                    <ActionForm action={changeRole} className="admin-inline">
                      <input type="hidden" name="id" value={u.id} />
                      <label htmlFor={`role-${u.id}`} className="visually-hidden">
                        Rol van {u.display_name}
                      </label>
                      <select id={`role-${u.id}`} name="role" defaultValue={u.role}>
                        {(Object.keys(roleNames) as Role[]).map((r) => (
                          <option key={r} value={r}>
                            {roleNames[r]}
                          </option>
                        ))}
                      </select>
                      <Submit className="btn btn-quiet admin-btn-small">
                        Wijzig<span className="visually-hidden"> rol van {u.display_name}</span>
                      </Submit>
                    </ActionForm>
                  </td>
                  <td>{u.has_2fa ? "✓ Aan" : "Nog niet ingesteld"}</td>
                  <td>
                    {u.last_sign_in_at
                      ? new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeZone: "Europe/Amsterdam" }).format(new Date(u.last_sign_in_at))
                      : "Nooit"}
                  </td>
                  <td>
                    {u.id !== me.id && (
                      <div className="admin-row-actions">
                        {u.has_2fa && (
                          <ActionForm action={resetTwoFactor} confirm={`2FA van ${u.display_name} wissen? Diegene koppelt dan een nieuwe app.`}>
                            <input type="hidden" name="id" value={u.id} />
                            <Submit className="btn btn-quiet admin-btn-small">
                              2FA opnieuw<span className="visually-hidden"> voor {u.display_name}</span>
                            </Submit>
                          </ActionForm>
                        )}
                        <ActionForm action={sendPasswordLink}>
                          <input type="hidden" name="id" value={u.id} />
                          <Submit className="btn btn-quiet admin-btn-small">
                            Nieuw wachtwoord<span className="visually-hidden"> voor {u.display_name}</span>
                          </Submit>
                        </ActionForm>
                        <ActionForm action={revokeStaff} confirm={`De toegang van ${u.display_name} intrekken?`}>
                          <input type="hidden" name="id" value={u.id} />
                          <Submit className="btn btn-quiet admin-btn-small">
                            Toegang intrekken<span className="visually-hidden"> voor {u.display_name}</span>
                          </Submit>
                        </ActionForm>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </section>
    </>
  );
}
