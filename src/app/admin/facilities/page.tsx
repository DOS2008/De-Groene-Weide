import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/admin/staff";
import { staffDb } from "@/lib/supabase/staff";
import { MissingBadge } from "../LangFields";

export const metadata: Metadata = { title: "Voorzieningen" };

export default async function FacilitiesPage() {
  await requireStaff("admin");
  const db = await staffDb();
  const { data } = await db.from("facilities").select("*").order("sort");

  return (
    <>
      <div className="admin-head">
        <div>
          <span className="eyebrow">Voorzieningen</span>
          <h1>Voorzieningen</h1>
        </div>
      </div>
      <section className="admin-card">
        <p className="admin-hint">
          Tekst, foto, openingstijden en toegankelijkheid. Een nieuwe voorziening komt op de plattegrond-tekening; dan verschijnt
          hij hier vanzelf, met de afstanden.
        </p>
        <ul className="admin-list">
          {(data ?? []).map((f) => (
            <li key={f.id}>
              <span>
                <Link href={`/admin/facilities/${f.id}`}>{f.name_nl}</Link>
                <MissingBadge row={f} fields={["name", "summary", "description", "hours", "access", "location"]} />
              </span>
              <span className="admin-hint">{f.hours_nl || "geen tijden"}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
