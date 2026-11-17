/**
 * Seed sections for the content that moved to the database in Prio 5.
 * Generated from src/content; rows that exist are never overwritten (only
 * empty translations get filled in).
 */
import { events } from "../src/content/events";
import { jokes } from "../src/content/jokes";
import { site } from "../src/content/site";
import { insert, localized, sqlValue, type Row } from "./lib/sql";

export function contentSeed(): string[] {
  const eventRows: Row[] = events.map((e) => ({
    id: e.id,
    kind: e.kind,
    age_group: e.ageGroup,
    start_time: e.startTime,
    recurrence: e.recurrence,
    status: "published",
    sample: e.sample ?? false,
    ...localized(e, ["title", "description", "location"]),
  }));

  const jokeRows: Row[] = jokes.map((j) => ({
    id: j.id,
    active: j.active,
    ...localized(j, ["text"]),
  }));

  // Site facts that Bert still has to supply are null and show as a
  // placeholder. The season comes from the seasons table.
  const { season: _season, ...facts } = site;
  void _season;

  const settings = [
    ["site", facts],
    ["plekmatch_enabled", true],
    ["retention_months", 24],
    ["cancel_free_days", 14],
    ["reminder_days_before", 3],
    ["review_url", null],
    ["facebook_page_id", null],
  ] as const;

  return [
    insert("events", eventRows, "id"),
    insert("jokes", jokeRows, "id"),
    `insert into public.settings (key, value, public) values\n${settings
      .map(([k, v]) => `  (${sqlValue(k)}, ${v === null ? "'null'::jsonb" : typeof v === "object" ? sqlValue(v) : `'${JSON.stringify(v)}'::jsonb`}, true)`)
      .join(",\n")}\non conflict (key) do nothing;\n`,
  ];
}
