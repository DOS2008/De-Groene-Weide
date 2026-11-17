import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin/staff";
import { staffDb } from "@/lib/supabase/staff";
import { ActionForm, Submit } from "../../ActionForm";
import { copyEvent, deleteEvent } from "../actions";
import { EventForm } from "../EventForm";

export const metadata: Metadata = { title: "Evenement bewerken" };

export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; copied?: string }>;
}) {
  await requireStaff("admin", "reception", "animation");
  const [{ id }, q] = await Promise.all([params, searchParams]);
  const db = await staffDb();
  const [{ data: event }, { data: media }] = await Promise.all([
    db.from("events").select("*").eq("id", id).maybeSingle(),
    db.from("media").select("path, alt_nl").order("created_at", { ascending: false }),
  ]);
  if (!event) notFound();

  return (
    <>
      <div className="admin-head">
        <div>
          <span className="eyebrow">
            <Link href="/admin/events">Evenementen</Link>
          </span>
          <h1>{event.title_nl}</h1>
        </div>
        <div className="admin-row-actions">
          <ActionForm action={copyEvent}>
            <input type="hidden" name="id" value={event.id} />
            <Submit className="btn btn-secondary admin-btn-small">Kopiëren</Submit>
          </ActionForm>
          <ActionForm action={deleteEvent} confirm={`"${event.title_nl}" verwijderen? Dit kan niet ongedaan worden.`}>
            <input type="hidden" name="id" value={event.id} />
            <Submit className="btn btn-quiet admin-btn-small">Verwijderen</Submit>
          </ActionForm>
        </div>
      </div>
      {q.saved && <p className="admin-ok">Het evenement is aangemaakt.</p>}
      {q.copied && <p className="admin-ok">Dit is een kopie, als concept. Pas de datum aan en publiceer.</p>}
      <section className="admin-card">
        <EventForm event={event} media={(media ?? []).map((m) => ({ path: m.path, alt: m.alt_nl }))} />
      </section>
    </>
  );
}
