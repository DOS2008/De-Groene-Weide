import type { Season } from "@/lib/season";
import type { Localized } from "@/lib/localized";

/**
 * Campsite settings. Later the `settings` table (Prio 5, F5.12).
 * null = still to be supplied by Bert; the site shows a placeholder.
 */
export const site = {
  name: "De Groene Weide",
  season: { start: "04-01", end: "10-31" } satisfies Season,
  phone: null as string | null,
  email: null as string | null,
  /** One line per row, e.g. ["Weidelaan 1", "1234 AB Ergens"]. */
  address: null as string[] | null,
  facebookUrl: null as string | null,
  reception: {
    weekdays: null as string | null,
    weekend: null as string | null,
  },
  arrivalFrom: null as string | null,
  departureUntil: null as string | null,
  /** Seasonal notice banner (F0.5). Off until the admin panel can set it. */
  notice: null as (Localized<"text"> & { active: boolean }) | null,
};

/** Link to a route planner, or null while the address is unknown. */
export function routePlannerUrl(): string | null {
  if (!site.address) return null;
  const destination = encodeURIComponent(site.address.join(", "));
  return `https://www.openstreetmap.org/directions?to=${destination}`;
}
