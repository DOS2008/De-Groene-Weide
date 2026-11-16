import type { Metadata } from "next";
import { getPathname } from "@/i18n/navigation";
import { routing, type RouteKey } from "@/i18n/routing";

/** Public base URL, e.g. https://degroeneweide.nl. Set SITE_URL in .env. */
export function siteUrl(): string {
  return (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

const ogLocale = { nl: "nl_NL", en: "en_GB", de: "de_DE" } as const;

/** The public path of a route in a language, e.g. "/reserveren". */
export function pathFor(route: RouteKey, locale: (typeof routing.locales)[number]) {
  return getPathname({ locale, href: route });
}

/**
 * Title, description, canonical URL and hreflang alternates for a page.
 * Only live languages get an alternate.
 */
export function pageMetadata({
  route,
  locale,
  title,
  description,
}: {
  route: RouteKey;
  locale: (typeof routing.locales)[number];
  title?: string;
  description?: string;
}): Metadata {
  const canonical = pathFor(route, locale);
  const languages: Record<string, string> = Object.fromEntries(
    routing.locales.map((l) => [l, pathFor(route, l)]),
  );
  languages["x-default"] = pathFor(route, routing.defaultLocale);

  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    alternates: { canonical, languages },
    openGraph: {
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      url: canonical,
      locale: ogLocale[locale],
      type: "website",
    },
  };
}
