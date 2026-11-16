import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { site } from "@/content/site";
import { Fact, Missing } from "@/components/Placeholder";
import { CookieSettingsButton } from "./CookieBanner";
import styles from "./SiteFooter.module.css";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const tc = await getTranslations("common");
  const tm = await getTranslations("meta");

  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.col}>
          <span className={styles.brand}>{tm("siteName")}</span>
          <span className={styles.muted}>{t("tagline")}</span>
          <span className={styles.muted}>
            {t("season")}: {tc("season")}
          </span>
        </div>

        <div className={styles.col}>
          <h2 className={styles.heading}>{t("address")}</h2>
          <address className={styles.address}>
            {site.address ? (
              site.address.map((line) => <span key={line}>{line}</span>)
            ) : (
              <Missing what="ADRES" />
            )}
          </address>
        </div>

        <div className={styles.col}>
          <h2 className={styles.heading}>{t("reception")}</h2>
          <dl className={styles.hours}>
            <dt>{t("weekdays")}</dt>
            <dd>
              <Fact value={site.reception.weekdays} what="TIJDEN" />
            </dd>
            <dt>{t("weekend")}</dt>
            <dd>
              <Fact value={site.reception.weekend} what="TIJDEN" />
            </dd>
          </dl>
        </div>

        <nav aria-label={t("navLabel")} className={styles.col}>
          <ul className={styles.links}>
            <li>
              <Link href="/accessibility">{t("accessibility")}</Link>
            </li>
            <li>
              <Link href="/house-rules">{t("houseRules")}</Link>
            </li>
            <li>
              <Link href="/privacy">{t("privacy")}</Link>
            </li>
            <li>
              <CookieSettingsButton className={styles.linkButton} />
            </li>
            <li>
              {site.facebookUrl ? (
                <a href={site.facebookUrl} rel="noopener">
                  {t("facebook")}
                  <span className="visually-hidden"> ({tc("newWindow")})</span>
                </a>
              ) : (
                <span>
                  {t("facebook")} <Missing what="LINK" />
                </span>
              )}
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
