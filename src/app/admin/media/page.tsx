import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/admin/staff";
import { staffDb } from "@/lib/supabase/staff";
import { mediaUrl } from "@/lib/supabase/env";
import { ActionForm, Submit } from "../ActionForm";
import { LangFields, MissingBadge } from "../LangFields";
import { deleteMedia, saveMediaAlt } from "./actions";
import { Uploader } from "./Uploader";

export const metadata: Metadata = { title: "Foto's & media" };

type Use = { label: string; href: string };

export default async function MediaPage() {
  const staff = await requireStaff("admin", "animation");
  const db = await staffDb();
  const [{ data: media }, events, plots, facilities, about] = await Promise.all([
    db.from("media").select("*").order("created_at", { ascending: false }),
    db.from("events").select("id, title_nl, photo_path").not("photo_path", "is", null),
    db.from("plots").select("id, photo_path").not("photo_path", "is", null),
    db.from("facilities").select("id, name_nl, photo_path").not("photo_path", "is", null),
    db.from("about_blocks").select("id, label_nl, photo_path").not("photo_path", "is", null),
  ]);
  const admin = staff.role === "admin";
  const uses = new Map<string, Use[]>();
  const add = (path: string, use: Use) => uses.set(path, [...(uses.get(path) ?? []), use]);
  for (const e of events.data ?? []) add(e.photo_path, { label: `Evenement: ${e.title_nl}`, href: `/admin/events/${e.id}` });
  for (const p of plots.data ?? []) add(p.photo_path, { label: `Plek ${p.id}`, href: admin ? `/admin/plots/${p.id}` : "" });
  for (const f of facilities.data ?? []) add(f.photo_path, { label: `Voorziening: ${f.name_nl}`, href: admin ? `/admin/facilities/${f.id}` : "" });
  for (const b of about.data ?? []) add(b.photo_path, { label: `Over ons: ${b.label_nl}`, href: admin ? "/admin/pages?pagina=about" : "" });

  return (
    <>
      <div className="admin-head">
        <div>
          <span className="eyebrow">Foto&apos;s & media</span>
          <h1>Foto&apos;s & media</h1>
        </div>
      </div>

      <section className="admin-card" aria-labelledby="upload-title">
        <h2 id="upload-title">Foto toevoegen</h2>
        <Uploader />
      </section>

      <section className="admin-card" aria-labelledby="all-title">
        <h2 id="all-title">Alle foto&apos;s</h2>
        {(media ?? []).length === 0 ? (
          <p>Nog geen foto&apos;s. De kippen poseren graag.</p>
        ) : (
          <ul className="admin-media-grid">
            {(media ?? []).map((m) => {
              const used = uses.get(m.path) ?? [];
              return (
                <li key={m.id} className="admin-card">
                  {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail straight from storage */}
                  <img src={mediaUrl(m.path) ?? ""} alt={m.alt_nl} loading="lazy" width={m.width ?? undefined} height={m.height ?? undefined} />
                  <MissingBadge row={m} fields={["alt"]} />
                  <p className="admin-hint">
                    {used.length === 0
                      ? "Nergens gebruikt."
                      : used.map((u, i) => (
                          <span key={i}>
                            {i > 0 && " · "}
                            {u.href ? <Link href={u.href}>{u.label}</Link> : u.label}
                          </span>
                        ))}
                  </p>
                  <details>
                    <summary className="admin-check">Alt-tekst aanpassen</summary>
                    <ActionForm action={saveMediaAlt} className="admin-form">
                      <input type="hidden" name="id" value={m.id} />
                      <LangFields name="alt" label="Alt-tekst" values={m} idPrefix={`m-${m.id}-`} maxLength={300} />
                      <div>
                        <Submit>Opslaan</Submit>
                      </div>
                    </ActionForm>
                  </details>
                  {used.length === 0 && (
                    <ActionForm action={deleteMedia} confirm="Deze foto verwijderen?">
                      <input type="hidden" name="id" value={m.id} />
                      <Submit className="btn btn-quiet admin-btn-small">Verwijderen</Submit>
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
