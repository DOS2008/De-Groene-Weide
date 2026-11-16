import { cacheLife } from "next/cache";
import { todayAtCampsite, type IsoDate } from "./dates";

/**
 * Today's date at the campsite, cached for about an hour so pages that show
 * "today" can still be prerendered and refresh on their own.
 */
export async function getToday(): Promise<IsoDate> {
  "use cache";
  cacheLife("hours");
  return todayAtCampsite();
}
