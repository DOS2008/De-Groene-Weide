import type { Localized } from "./localized";
import { addDays, eachDay, weekday, type IsoDate, type Weekday } from "./dates";
import { isInSeason, type Season } from "./season";

export type EventKind = "animals" | "play" | "pool" | "food";
export type AgeGroup = "all" | "toddlers" | "kids" | "adults";
export const ageGroups: AgeGroup[] = ["all", "toddlers", "kids", "adults"];

export type Recurrence =
  | { type: "once"; date: IsoDate }
  | { type: "daily"; from: IsoDate; until?: IsoDate }
  | { type: "weekly"; weekdays: Weekday[]; from: IsoDate; until?: IsoDate };

export type CampEvent = {
  id: string;
  kind: EventKind;
  ageGroup: AgeGroup;
  /** "HH:MM", local time at the campsite. */
  startTime: string;
  recurrence: Recurrence;
  /** Dates on which a recurring event does not take place. */
  skipDates?: IsoDate[];
  /** Example events from the design, never published as structured data. */
  sample?: boolean;
} & Localized<"title"> &
  Localized<"description"> &
  Localized<"location">;

export type Occurrence = { event: CampEvent; date: IsoDate };

function occursOn(event: CampEvent, date: IsoDate): boolean {
  if (event.skipDates?.includes(date)) return false;
  const r = event.recurrence;
  switch (r.type) {
    case "once":
      return r.date === date;
    case "daily":
      return date >= r.from && (!r.until || date <= r.until);
    case "weekly":
      return (
        date >= r.from &&
        (!r.until || date <= r.until) &&
        r.weekdays.includes(weekday(date))
      );
  }
}

/**
 * Expand events into occurrences from `from` to `to` (both included),
 * sorted by date, then start time, then id.
 */
export function expandEvents(
  events: CampEvent[],
  from: IsoDate,
  to: IsoDate,
): Occurrence[] {
  const out: Occurrence[] = [];
  for (const date of eachDay(from, to)) {
    for (const event of events) {
      if (occursOn(event, date)) out.push({ event, date });
    }
  }
  return out.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.event.startTime.localeCompare(b.event.startTime) ||
      a.event.id.localeCompare(b.event.id),
  );
}

/** Occurrences on open days only: nothing happens while the campsite is closed. */
export function expandInSeason(
  events: CampEvent[],
  season: Season,
  from: IsoDate,
  to: IsoDate,
): Occurrence[] {
  return expandEvents(events, from, to).filter((o) =>
    isInSeason(season, o.date),
  );
}

/** Whether an event suits a chosen age group. "all" events suit everyone. */
export function matchesAge(event: CampEvent, filter: AgeGroup): boolean {
  return filter === "all" || event.ageGroup === "all" || event.ageGroup === filter;
}

/**
 * The next occurrence of each event from `from`, soonest first, so a
 * daily event does not crowd out the rest. Looks ahead `days` days.
 */
export function nextOfEach(
  events: CampEvent[],
  season: Season,
  from: IsoDate,
  limit: number,
  days = 14,
): Occurrence[] {
  const seen = new Set<string>();
  const out: Occurrence[] = [];
  const to = addDays(from, days - 1);
  for (const o of expandInSeason(events, season, from, to)) {
    if (seen.has(o.event.id)) continue;
    seen.add(o.event.id);
    out.push(o);
    if (out.length === limit) break;
  }
  return out;
}
