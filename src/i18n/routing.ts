import { defineRouting } from "next-intl/routing";

/** Every language the site is built for. Content has a field for each. */
export const allLocales = ["nl", "en", "de"] as const;
export type AnyLocale = (typeof allLocales)[number];

/**
 * Languages that are live. EN and DE stay off until their translation is
 * complete (docs/mvp.md, Prio 4). Turning one on is a change to this list.
 */
const enabledLocales = ["nl", "en", "de"] as const satisfies readonly AnyLocale[];
type EnabledLocale = (typeof enabledLocales)[number];

/**
 * Public URL per page and language. The keys are the internal route names
 * (the folders under src/app/[locale]); the values are what visitors see.
 */
const slugs = {
  "/": { nl: "/", en: "/", de: "/" },
  "/activities": {
    nl: "/terrein-en-activiteiten",
    en: "/site-and-activities",
    de: "/gelaende-und-aktivitaeten",
  },
  "/site-map": { nl: "/plattegrond", en: "/site-map", de: "/lageplan" },
  "/book": { nl: "/reserveren", en: "/book", de: "/buchen" },
  "/events": { nl: "/evenementen", en: "/events", de: "/veranstaltungen" },
  "/about": { nl: "/over-ons", en: "/about-us", de: "/ueber-uns" },
  "/contact": { nl: "/contact", en: "/contact", de: "/kontakt" },
  "/accessibility": {
    nl: "/toegankelijkheid",
    en: "/accessibility",
    de: "/barrierefreiheit",
  },
  "/house-rules": {
    nl: "/huisregels-en-faq",
    en: "/house-rules-and-faq",
    de: "/hausordnung-und-faq",
  },
  "/privacy": {
    nl: "/privacy-en-cookies",
    en: "/privacy-and-cookies",
    de: "/datenschutz-und-cookies",
  },
} as const satisfies Record<string, Record<AnyLocale, string>>;

/**
 * Pages that are never in the sitemap or the menu, such as the guest's own
 * booking behind the manage link from the email.
 */
const privateSlugs = {
  "/my-booking/[token]": {
    nl: "/mijn-reservering/[token]",
    en: "/my-booking/[token]",
    de: "/meine-buchung/[token]",
  },
} as const satisfies Record<string, Record<AnyLocale, string>>;

export type RouteKey = keyof typeof slugs;
export const routeKeys = Object.keys(slugs) as RouteKey[];

function pathnamesFor<L extends AnyLocale>(locales: readonly L[]) {
  return Object.fromEntries(
    Object.entries({ ...slugs, ...privateSlugs }).map(([route, perLocale]) => [
      route,
      Object.fromEntries(locales.map((l) => [l, perLocale[l]])),
    ]),
  ) as { [K in RouteKey | keyof typeof privateSlugs]: Record<L, string> };
}

export const routing = defineRouting({
  locales: enabledLocales,
  defaultLocale: "nl",
  // Dutch has no prefix: "/" is the Dutch homepage, "/reserveren" a Dutch page.
  localePrefix: "as-needed",
  // Never redirect on browser language, and set no locale cookie.
  localeDetection: false,
  localeCookie: false,
  // hreflang is written in the page metadata instead.
  alternateLinks: false,
  pathnames: pathnamesFor<EnabledLocale>(enabledLocales),
});
