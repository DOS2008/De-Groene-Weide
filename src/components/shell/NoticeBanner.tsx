import { site } from "@/content/site";
import { pick } from "@/lib/localized";
import type { AnyLocale } from "@/i18n/routing";
import styles from "./NoticeBanner.module.css";

/**
 * Seasonal notice from Bert ("Zwembad vandaag dicht"). The slot exists from
 * Prio 1; the admin panel switches it on in Prio 5.
 */
export function NoticeBanner({ locale }: { locale: AnyLocale }) {
  const notice = site.notice;
  const message = notice?.active ? pick(notice, "text", locale) : null;
  if (!message) return null;
  return (
    <div className={styles.notice} role="status">
      {message}
    </div>
  );
}
