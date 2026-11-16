import type { RouteKey } from "@/i18n/routing";

export type NavItem = {
  route: RouteKey;
  label: "home" | "activities" | "siteMap" | "book" | "events" | "about" | "contact";
};

/** The 7 pages of the main navigation, in the order of the design. */
export const mainNav: NavItem[] = [
  { route: "/", label: "home" },
  { route: "/activities", label: "activities" },
  { route: "/site-map", label: "siteMap" },
  { route: "/book", label: "book" },
  { route: "/events", label: "events" },
  { route: "/about", label: "about" },
  { route: "/contact", label: "contact" },
];
