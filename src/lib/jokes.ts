import type { Joke } from "@/content/jokes";
import type { AnyLocale } from "@/i18n/routing";
import { toUtcDate, type IsoDate } from "./dates";
import { pick } from "./localized";

/**
 * The joke of the day: the same joke all day, a different one the next.
 * Only active jokes written in the page's language take part.
 */
export function jokeOfTheDay(jokes: Joke[], date: IsoDate, locale: AnyLocale): string | null {
  const pool = jokes
    .filter((j) => j.active)
    .map((j) => pick(j, "text", locale))
    .filter((text): text is string => Boolean(text));
  if (pool.length === 0) return null;
  const dayNumber = Math.floor(toUtcDate(date).getTime() / 86_400_000);
  return pool[dayNumber % pool.length];
}
