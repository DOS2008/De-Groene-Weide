import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { locale as rootLocale } from "next/root-params";
import { routing } from "./routing";

export type Locale = (typeof routing.locales)[number];

/**
 * The language of the current page, read from the root [locale] segment.
 * Unlike the `params` prop this needs no <Suspense>: a language change is
 * always a full page load. Unknown values (e.g. "/foo.txt") give a 404.
 */
export async function getPageLocale(): Promise<Locale> {
  const value = await rootLocale();
  if (!hasLocale(routing.locales, value)) notFound();
  return value;
}

/**
 * For the root layout: falls back to Dutch instead of a 404, so the 404
 * that the page raises renders inside the normal site layout. (A 404
 * thrown by the root layout itself would show Next's bare default page.)
 */
export async function getLayoutLocale(): Promise<Locale> {
  const value = await rootLocale();
  return hasLocale(routing.locales, value) ? value : routing.defaultLocale;
}
