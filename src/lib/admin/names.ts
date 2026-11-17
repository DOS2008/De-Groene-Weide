/** Dutch names for enum values in the admin panel (plain module, no "use client"). */

export const eventKindNames: Record<string, string> = {
  animals: "Dieren",
  play: "Spelen",
  pool: "Zwembad",
  food: "Eten en drinken",
};

export const ageGroupNames: Record<string, string> = {
  all: "Iedereen",
  toddlers: "Peuters (met ouder)",
  kids: "Kinderen",
  adults: "Volwassenen",
};

export const weekdayNames = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"];

export const plotTypeNames: Record<string, string> = {
  tent_caravan: "Tent of caravan",
  camper: "Camper",
  safari_tent: "Safaritent",
};

export const surfaceNames: Record<string, string> = {
  grass: "Gras",
  semi_paved: "Halfverhard",
  paved: "Verhard",
};

export const shadeNames: Record<string, string> = {
  none: "Geen schaduw",
  some: "Wat schaduw",
  lots: "Veel schaduw",
};

export const zoneNames: Record<string, string> = {
  A: "Weide A",
  B: "Weide B",
  C: "Camperplaatsen",
  S: "Safaritenten",
};

export const localeNames: Record<string, string> = { nl: "Nederlands", en: "Engels", de: "Duits" };

type Recurrence =
  | { type: "once"; date: string }
  | { type: "daily"; from: string; until?: string }
  | { type: "weekly"; weekdays: number[]; from: string; until?: string };

/** "Elke dinsdag en vrijdag, vanaf 2027-04-01" for the events list. */
export function describeRecurrence(r: Recurrence): string {
  const until = "until" in r && r.until ? ` t/m ${r.until}` : "";
  if (r.type === "once") return `Eenmalig op ${r.date}`;
  if (r.type === "daily") return `Elke dag, vanaf ${r.from}${until}`;
  const days = r.weekdays.map((d) => weekdayNames[d - 1]);
  const list = days.length > 1 ? `${days.slice(0, -1).join(", ")} en ${days.at(-1)}` : days[0];
  return `Elke ${list}, vanaf ${r.from}${until}`;
}
