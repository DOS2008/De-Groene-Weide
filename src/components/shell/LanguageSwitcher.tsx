"use client";

import { useParams } from "next/navigation";
import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import styles from "./LanguageSwitcher.module.css";

const names: Record<string, { short: string; long: string }> = {
  nl: { short: "NL", long: "Nederlands" },
  en: { short: "EN", long: "English" },
  de: { short: "DE", long: "Deutsch" },
};

/**
 * Switches language and stays on the same page (each language has its own
 * slug). Hidden while only one language is live. Never switches by itself.
 */
export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const params = useParams();
  if (routing.locales.length < 2) return null;

  return (
    <nav aria-label="Taal · Language · Sprache" className={styles.switcher}>
      <ul>
        {routing.locales.map((l) => (
          <li key={l}>
            <Link
              // The internal route plus its params; next-intl picks the slug.
              href={{ pathname, params } as never}
              locale={l}
              lang={l}
              hrefLang={l}
              aria-current={l === locale ? "true" : undefined}
              aria-label={names[l].long}
              className={styles.link}
            >
              {names[l].short}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
