"use server";

import { requireStaff } from "@/lib/admin/staff";
import { staffDb } from "@/lib/supabase/staff";
import { dbErrorText } from "@/lib/admin/bookings";
import { refresh, str } from "@/lib/admin/form";
import type { FormState } from "../ActionForm";

/** Tables whose old versions can be put back, with their key and cache tag. */
const RESTORABLE: Record<string, { key: string[]; tag?: string }> = {
  texts: { key: ["key"], tag: "texts" },
  about_blocks: { key: ["id"], tag: "about" },
  events: { key: ["id"], tag: "events" },
  facilities: { key: ["id"], tag: "facilities" },
  jokes: { key: ["id"], tag: "jokes" },
  settings: { key: ["key"], tag: "settings" },
  prices: { key: ["price_group_id", "period_id"], tag: "prices" },
  plot_blocks: { key: ["id"] },
};

/**
 * "Zet terug": writes the version from before a change back (or brings a
 * deleted row back). Goes through RLS and every trigger like any edit, and
 * is itself logged, so it can be undone too.
 */
export async function restoreVersion(_: FormState, form: FormData): Promise<FormState> {
  await requireStaff("admin");
  const db = await staffDb();
  const { data: entry } = await db.from("audit_log").select("*").eq("id", Number(str(form, "id"))).maybeSingle();
  if (!entry) return { error: "Die wijziging staat niet (meer) in de geschiedenis." };
  const table = RESTORABLE[entry.table_name as string];
  if (!table || !entry.old_data || entry.action === "insert") return { error: "Dit kun je niet terugzetten." };

  const old = entry.old_data as Record<string, unknown>;
  let query;
  if (entry.action === "delete") {
    query = db.from(entry.table_name).upsert(old);
  } else {
    const values = Object.fromEntries(Object.entries(old).filter(([k]) => !table.key.includes(k)));
    query = db.from(entry.table_name).update(values);
    for (const k of table.key) query = query.eq(k, old[k] as string);
  }
  const { error } = await query;
  if (error) return { error: dbErrorText(error.message) };
  if (table.tag) refresh(table.tag);
  else refresh();
  return { ok: "Teruggezet. Ook dat staat nu in de geschiedenis." };
}
