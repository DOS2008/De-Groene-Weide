import type { MetadataRoute } from "next";
import { routeKeys, routing } from "@/i18n/routing";
import { pathFor, siteUrl } from "@/lib/seo";

// Every page in every live language, with its hreflang alternates.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return routeKeys.flatMap((route) =>
    routing.locales.map((locale) => ({
      url: `${base}${pathFor(route, locale)}`,
      changeFrequency: route === "/events" ? ("weekly" as const) : ("monthly" as const),
      priority: route === "/" ? 1 : route === "/book" ? 0.9 : 0.7,
      alternates: {
        languages: Object.fromEntries(routing.locales.map((l) => [l, `${base}${pathFor(route, l)}`])),
      },
    })),
  );
}
