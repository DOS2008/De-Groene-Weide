import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/admin/staff";
import { staffDb } from "@/lib/supabase/staff";
import { ActionForm, Submit } from "../ActionForm";
import { restoreVersion } from "./actions";

export const metadata: Metadata = { title: "Geschiedenis" };

const groups: Record<string, { name: string; tables: string[] }> = {
  alles: { name: "Alles", tables: [] },
  reserveringen: { name: "Reserveringen", tables: ["reservations"] },
  plekken: { name: "Plekken & blokkades", tables: ["plots", "plot_blocks", "facilities"] },
  prijzen: { name: "Prijzen & seizoenen", tables: ["prices", "price_periods", "extras", "seasons"] },
  teksten: { name: "Teksten & foto's", tables: ["texts", "about_blocks", "media", "jokes"] },
  evenementen: { name: "Evenementen", tables: ["events"] },
  instellingen: { name: "Instellingen & gebruikers", tables: ["settings", "profiles"] },
};

const tableNames: Record<string, string> = {
  reservations: "Reservering",
  plots: "Plek",
  plot_blocks: "Blokkade",
  facilities: "Voorziening",
  prices: "Prijs",
  price_periods: "Periode",
  extras: "Extra kosten",
  seasons: "Seizoen",
  texts: "Tekst",
  about_blocks: "Over ons",
  media: "Foto",
  jokes: "Grap",
  events: "Evenement",
  settings: "Instelling",
  profiles: "Gebruiker",
};
const actionNames: Record<string, string> = { insert: "toegevoegd", update: "gewijzigd", delete: "verwijderd" };
const RESTORABLE = new Set(["texts", "about_blocks", "events", "facilities", "jokes", "settings", "prices", "plot_blocks"]);

type Entry = {
  id: number;
  at: string;
  actor: string | null;
  actor_name: string | null;
  table_name: string;
  row_key: string;
  action: "insert" | "update" | "delete";
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
};

const show = (v: unknown) => {
  const s = v === null || v === undefined ? "leeg" : typeof v === "object" ? JSON.stringify(v) : String(v);
  return s.length > 80 ? `${s.slice(0, 80)}…` : s;
};

function changes(e: Entry): [string, unknown, unknown][] {
  if (e.action !== "update" || !e.old_data || !e.new_data) return [];
  return Object.keys(e.new_data)
    .filter((k) => JSON.stringify(e.old_data![k]) !== JSON.stringify(e.new_data![k]))
    .map((k) => [k, e.old_data![k], e.new_data![k]]);
}

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ toon?: string }> }) {
  await requireStaff("admin");
  const q = await searchParams;
  const group = groups[q.toon ?? "alles"] ? (q.toon ?? "alles") : "alles";
  const db = await staffDb();
  let query = db.from("audit_log").select("*").order("at", { ascending: false }).limit(150);
  if (groups[group].tables.length) query = query.in("table_name", groups[group].tables);
  const { data, error } = await query;
  const when = (iso: string) =>
    new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Amsterdam" }).format(new Date(iso));

  return (
    <>
      <div className="admin-head">
        <div>
          <span className="eyebrow">Geschiedenis</span>
          <h1>Geschiedenis</h1>
        </div>
      </div>
      <p className="admin-hint">
        Wie wat veranderde en wanneer. Gegevens van gasten (naam, e-mail, telefoon) staan hier nooit in. Teksten, evenementen,
        prijzen, instellingen en blokkades kun je terugzetten.
      </p>
      <ul className="admin-tabs" aria-label="Soort wijziging">
        {Object.entries(groups).map(([id, g]) => (
          <li key={id}>
            <Link href={id === "alles" ? "/admin/history" : `/admin/history?toon=${id}`} aria-current={group === id ? "page" : undefined}>
              {g.name}
            </Link>
          </li>
        ))}
      </ul>
      {error && <p className="admin-error">De geschiedenis kon niet laden.</p>}
      <section className="admin-card" aria-label="Wijzigingen">
        {(data ?? []).length === 0 ? (
          <p>Nog niets veranderd.</p>
        ) : (
          <ul className="admin-list">
            {((data ?? []) as Entry[]).map((e) => {
              const diff = changes(e);
              return (
                <li key={e.id}>
                  <div className="admin-grow">
                    <span>
                      <strong>
                        {tableNames[e.table_name] ?? e.table_name} {e.row_key}
                      </strong>{" "}
                      {actionNames[e.action]} door {e.actor_name ?? (e.actor ? "een oud account" : "de website of het systeem")} ·{" "}
                      <span className="admin-hint">{when(e.at)}</span>
                    </span>
                    {diff.length > 0 && (
                      <ul className="admin-diff">
                        {diff.slice(0, 6).map(([k, a, b]) => (
                          <li key={k}>
                            {k}: <del>{show(a)}</del> → <ins>{show(b)}</ins>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {RESTORABLE.has(e.table_name) && e.action !== "insert" && e.old_data && (
                    <ActionForm action={restoreVersion} confirm="Deze vorige versie terugzetten?">
                      <input type="hidden" name="id" value={e.id} />
                      <Submit className="btn btn-quiet admin-btn-small">
                        Zet terug<span className="visually-hidden"> ({tableNames[e.table_name]} {e.row_key})</span>
                      </Submit>
                    </ActionForm>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
