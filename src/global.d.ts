import type messages from "../messages/nl.json";
import type { routing } from "@/i18n/routing";

// Type-checks message keys against the Dutch catalog, which is the source.
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
