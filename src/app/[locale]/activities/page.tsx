import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getPageLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { facilities } from "@/content/facilities";
import { Chicken } from "@/components/Chicken";
import { FacilityTile } from "@/components/FacilityTile";
import { FacilityIconFor } from "@/components/icons";
import { PageIntro } from "@/components/PageIntro";
import { WithPlaceholders } from "@/components/Placeholder";
import { text } from "@/lib/localized";
import { pageMetadata } from "@/lib/seo";
import styles from "./activities.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPageLocale();
  const t = await getTranslations("activities");
  return pageMetadata({
    route: "/activities",
    locale,
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default async function ActivitiesPage() {
  const locale = await getPageLocale();
  const t = await getTranslations("activities");
  const tc = await getTranslations("common");

  return (
    <>
      <section className={styles.top}>
        <div className={`container ${styles.topInner}`}>
          <PageIntro eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")}>
            <nav aria-label={t("onThisPage")}>
              <ul className={styles.chips}>
                {facilities.map((f) => (
                  <li key={f.id}>
                    <a href={`#${f.id}`} className={styles.chip}>
                      {text(f, "name", locale)}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </PageIntro>
          <figure className={styles.quote}>
            <Chicken size={120} />
            <blockquote>
              <p>{t("chickenQuote")}</p>
            </blockquote>
          </figure>
        </div>
      </section>

      <div className="container section">
        <ul className={styles.list}>
          {facilities.map((f) => (
            <li key={f.id} id={f.id} className={styles.card}>
              <FacilityTile facility={f} height={200} />
              <div className={styles.body}>
                <div className={styles.head}>
                  <span className={styles.icon}>
                    <FacilityIconFor icon={f.icon} size={28} />
                  </span>
                  <h2>{text(f, "name", locale)}</h2>
                </div>
                <p>{text(f, "description", locale)}</p>
                <dl className={styles.meta}>
                  <div>
                    <dt>{f.hoursLabel === "when" ? t("when") : t("open")}</dt>
                    <dd>
                      <WithPlaceholders text={text(f, "hours", locale)} />
                    </dd>
                  </div>
                  <div>
                    <dt>{t("access")}</dt>
                    <dd>
                      <WithPlaceholders text={text(f, "access", locale)} />
                    </dd>
                  </div>
                </dl>
                <Link href={{ pathname: "/site-map", hash: f.id }} className={styles.mapLink}>
                  {tc("viewOnMap")} <span aria-hidden="true">→</span>
                </Link>
              </div>
            </li>
          ))}
        </ul>

        <div className={styles.bands}>
          <section className="band band-straw" aria-labelledby="access-title">
            <div>
              <h2 id="access-title">{t("accessTitle")}</h2>
              <p className="muted">{t("accessText")}</p>
            </div>
            <Link href="/accessibility" className="btn btn-secondary">
              {t("accessCta")}
            </Link>
          </section>
          <section className="band band-grass" aria-labelledby="cta-title">
            <div>
              <h2 id="cta-title">{t("ctaTitle")}</h2>
              <p>{t("ctaText")}</p>
            </div>
            <Link href="/book" className="btn btn-primary">
              {tc("bookCta")}
            </Link>
          </section>
        </div>
      </div>
    </>
  );
}
