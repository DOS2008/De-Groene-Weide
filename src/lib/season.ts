import type { IsoDate } from "./dates";

/** Opening season as month-day, e.g. { start: "04-01", end: "10-31" }. */
export type Season = { start: string; end: string };

export function seasonOfYear(season: Season, year: number) {
  return { start: `${year}-${season.start}`, end: `${year}-${season.end}` };
}

export function isInSeason(season: Season, date: IsoDate): boolean {
  const { start, end } = seasonOfYear(season, Number(date.slice(0, 4)));
  return date >= start && date <= end;
}

/**
 * The first open day on or after `date`: the date itself in season,
 * otherwise the start of the next season.
 */
export function firstOpenDay(season: Season, date: IsoDate): IsoDate {
  const year = Number(date.slice(0, 4));
  const { start, end } = seasonOfYear(season, year);
  if (date < start) return start;
  if (date <= end) return date;
  return seasonOfYear(season, year + 1).start;
}
