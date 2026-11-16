import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware Link and helpers. Always link with the internal route name
// (href="/book"), never with a slug: the slug depends on the language.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
