/**
 * Calendar dates as "YYYY-MM-DD" strings. The campsite lives in one time
 * zone, so dates never need a clock time or an offset. All arithmetic runs
 * in UTC to stay clear of daylight saving changes.
 */
export type IsoDate = string;

/** 1 = Monday … 7 = Sunday (ISO 8601). */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== "string") return false;
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return toIsoDate(d) === value;
}

export function toUtcDate(date: IsoDate): Date {
  const m = ISO_DATE.exec(date);
  if (!m) throw new Error(`Not an ISO date: ${date}`);
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
}

function toIsoDate(d: Date): IsoDate {
  return d.toISOString().slice(0, 10);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const d = toUtcDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return toIsoDate(d);
}

export function weekday(date: IsoDate): Weekday {
  const day = toUtcDate(date).getUTCDay(); // 0 = Sunday
  return (day === 0 ? 7 : day) as Weekday;
}

/** The Monday of the week that contains `date`. */
export function startOfWeek(date: IsoDate): IsoDate {
  return addDays(date, 1 - weekday(date));
}

/** Every date from `from` to `to`, both included. */
export function eachDay(from: IsoDate, to: IsoDate): IsoDate[] {
  const days: IsoDate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  return days;
}

/** Today's date at the campsite. */
export function todayAtCampsite(now: Date = new Date()): IsoDate {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Format a date for display, e.g. "woensdag 1 april". */
export function formatDate(
  date: IsoDate,
  locale: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
  },
): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(
    toUtcDate(date),
  );
}
