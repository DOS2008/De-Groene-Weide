import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/admin/staff";
import { staffDb } from "@/lib/supabase/staff";
import { todayAtCampsite } from "@/lib/dates";
import { EventForm } from "../EventForm";

export const metadata: Metadata = { title: "Nieuw evenement" };

export default async function NewEventPage() {
  await requireStaff("admin", "reception", "animation");
  const db = await staffDb();
  const { data: media } = await db.from("media").select("path, alt_nl").order("created_at", { ascending: false });

  return (
    <>
      <div className="admin-head">
        <div>
          <span className="eyebrow">
            <Link href="/admin/events">Evenementen</Link>
          </span>
          <h1>Nieuw evenement</h1>
        </div>
      </div>
      <section className="admin-card">
        <EventForm
          event={{ recurrence: { type: "weekly", from: todayAtCampsite(), weekdays: [] }, status: "draft" }}
          media={(media ?? []).map((m) => ({ path: m.path, alt: m.alt_nl }))}
        />
      </section>
    </>
  );
}
