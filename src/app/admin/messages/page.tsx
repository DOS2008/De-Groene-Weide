import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/admin/staff";
import { staffDb } from "@/lib/supabase/staff";
import { localeNames } from "@/lib/admin/names";
import { ActionForm, Submit } from "../ActionForm";
import { deleteMessage, replyMessage, setMessageStatus } from "./actions";

export const metadata: Metadata = { title: "Berichten" };

const when = (iso: string) =>
  new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Amsterdam" }).format(new Date(iso));

type Search = { toon?: string; verstuurd?: string; klaar?: string; terug?: string };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const staff = await requireStaff("admin", "reception");
  const q = await searchParams;
  const show = q.toon === "afgehandeld" ? "done" : "new";
  const db = await staffDb();
  const [{ data, error }, { count: newCount }] = await Promise.all([
    db.from("messages").select("*").eq("status", show).order("created_at", { ascending: show === "new" }).limit(100),
    db.from("messages").select("id", { count: "exact", head: true }).eq("status", "new"),
  ]);

  return (
    <>
      <div className="admin-head">
        <div>
          <span className="eyebrow">Berichten</span>
          <h1>Berichten</h1>
        </div>
      </div>
      <ul className="admin-tabs" aria-label="Welke berichten">
        <li>
          <Link href="/admin/messages" aria-current={show === "new" ? "page" : undefined}>
            Nieuw ({newCount ?? 0})
          </Link>
        </li>
        <li>
          <Link href="/admin/messages?toon=afgehandeld" aria-current={show === "done" ? "page" : undefined}>
            Afgehandeld
          </Link>
        </li>
      </ul>

      <div aria-live="polite">
        {q.verstuurd && <p className="admin-ok">Verstuurd naar {q.verstuurd}. Het bericht staat nu bij Afgehandeld.</p>}
        {q.klaar && <p className="admin-ok">Afgehandeld. Het bericht staat nu bij Afgehandeld.</p>}
        {q.terug && <p className="admin-ok">Het bericht staat weer bij Nieuw.</p>}
      </div>
      {error && <p className="admin-error">De berichten konden niet laden.</p>}
      {data?.length === 0 && (
        <section className="admin-card">
          <p>{show === "new" ? "Geen nieuwe berichten. Tijd voor koffie." : "Nog niets afgehandeld."}</p>
        </section>
      )}

      {data?.map((m) => (
        <article key={m.id} className="admin-card" aria-labelledby={`msg-${m.id}`}>
          <div className="admin-head">
            <div>
              <h2 id={`msg-${m.id}`}>{m.subject || "Bericht zonder onderwerp"}</h2>
              <p className="admin-hint">
                Van {m.name} · <a href={`mailto:${m.email}`}>{m.email}</a> · {when(m.created_at)} · {localeNames[m.locale] ?? m.locale}
              </p>
            </div>
            <div className="admin-row-actions">
              <ActionForm action={setMessageStatus}>
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="status" value={m.status === "new" ? "done" : "new"} />
                <Submit className="btn btn-secondary admin-btn-small">{m.status === "new" ? "Afgehandeld" : "Terug naar nieuw"}</Submit>
              </ActionForm>
              {staff.role === "admin" && (
                <ActionForm action={deleteMessage} confirm="Dit bericht verwijderen?">
                  <input type="hidden" name="id" value={m.id} />
                  <Submit className="btn btn-quiet admin-btn-small">Verwijderen</Submit>
                </ActionForm>
              )}
            </div>
          </div>
          <p className="admin-message">{m.body}</p>
          {m.reply_text ? (
            <>
              <h3>Jouw antwoord ({when(m.replied_at)})</h3>
              <p className="admin-message">{m.reply_text}</p>
            </>
          ) : (
            <ActionForm action={replyMessage} className="admin-form">
              <input type="hidden" name="id" value={m.id} />
              <div className="admin-field">
                <label htmlFor={`reply-${m.id}`}>Antwoord aan {m.name}</label>
                <textarea id={`reply-${m.id}`} name="reply" rows={4} maxLength={5000} aria-describedby={`reply-hint-${m.id}`} />
                <p className="admin-hint" id={`reply-hint-${m.id}`}>
                  Gaat per mail naar {m.email}. De gast schreef in het {localeNames[m.locale]?.toLowerCase() ?? "Nederlands"}.
                </p>
              </div>
              <div>
                <Submit>Antwoord versturen</Submit>
              </div>
            </ActionForm>
          )}
        </article>
      ))}
    </>
  );
}
