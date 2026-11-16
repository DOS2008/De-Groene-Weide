import { addDays, formatDate, type Weekday } from "@/lib/dates";
import type { CampEvent } from "@/lib/events";

/** Name of an ISO weekday, e.g. "woensdag". */
export function weekdayName(day: Weekday, locale: string): string {
  // 1 January 2024 was a Monday.
  return formatDate(addDays("2024-01-01", day - 1), locale, { weekday: "long" });
}

/** "Elke dag", "Elke woensdag" or a date, from translated templates. */
export function recurrenceText(
  event: CampEvent,
  locale: string,
  labels: { everyDay: string; everyWeekday: (weekday: string) => string },
): string {
  const r = event.recurrence;
  switch (r.type) {
    case "daily":
      return labels.everyDay;
    case "weekly":
      return r.weekdays.map((d) => labels.everyWeekday(weekdayName(d, locale))).join(", ");
    case "once":
      return formatDate(r.date, locale);
  }
}

/** Surface colour per kind, matching the legend (always with an icon too). */
export const kindSurface: Record<CampEvent["kind"], string> = {
  animals: "var(--color-stro)",
  play: "var(--color-gras-licht)",
  pool: "var(--color-water)",
  food: "var(--color-eigeel)",
};
