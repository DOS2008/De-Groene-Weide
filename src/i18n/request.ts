import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { routing } from "./routing";

export default getRequestConfig(async ({ locale: explicit }) => {
  // An explicit locale (getTranslations({ locale })) wins; server actions
  // must pass one, because root params are not available there.
  let requested: string | undefined = explicit;
  if (!requested) {
    try {
      requested = await rootLocale();
    } catch {
      requested = undefined;
    }
  }
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    timeZone: "Europe/Amsterdam",
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
