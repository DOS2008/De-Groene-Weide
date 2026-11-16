import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getPageLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { milestones, team } from "@/content/about";
import { Chicken } from "@/components/Chicken";
import { PageIntro } from "@/components/PageIntro";
import { WithPlaceholders } from "@/components/Placeholder";
import { text } from "@/lib/localized";
import { pageMetadata } from "@/lib/seo";
import styles from "./about.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPageLocale();
  const t = await getTranslations("about");
  return pageMetadata({
    route: "/about",
    locale,
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default async function AboutPage() {
  const locale = await getPageLocale();
  const t = await getTranslations("about");
  const tc = await getTranslations("common");
  const values = t.raw("values") as { title: string; text: string }[];

  return (
    <>
      <section className={styles.top}>
        <div className={`container ${styles.topInner}`}>
          <PageIntro eyebrow={t("eyebrow")} title={t("title")} lead={<WithPlaceholders text={t("lead")} />} />
          {/* Stands in for Bert's photo until it arrives. */}
          <div className={styles.photo} role="img" aria-label={t("photo")}>
            <Chicken size={140} />
            <span className="placeholder">[Foto van Bert]</span>
          </div>
        </div>
      </section>

      <div className="container">
        <section className="section" aria-labelledby="story-title">
          <h2 id="story-title" className={styles.h2}>
            {t("storyTitle")}
          </h2>
          <ol className={styles.timeline}>
            {milestones.map((m) => (
              <li key={m.id} className={`card ${styles.milestone}`}>
                <span className={styles.year}>
                  <WithPlaceholders text={text(m, "year", locale)} />
                </span>
                <h3>{text(m, "title", locale)}</h3>
                <p className="muted">
                  <WithPlaceholders text={text(m, "text", locale)} />
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="values-title">
          <h2 id="values-title" className={styles.h2}>
            {t("valuesTitle")}
          </h2>
          <ul className={`grid-cards ${styles.plain}`}>
            {values.map((v) => (
              <li key={v.title} className={`card ${styles.value}`}>
                <h3>{v.title}</h3>
                <p className="muted">{v.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="section" aria-labelledby="team-title">
          <h2 id="team-title" className={styles.h2}>
            {t("teamTitle")}
          </h2>
          <ul className={`grid-cards ${styles.plain}`}>
            {team.map((m) => (
              <li key={m.id} className={`card ${styles.member}`}>
                <div className={styles.memberPhoto} aria-hidden="true">
                  {m.isChicken ? <Chicken size={110} /> : <span className="placeholder">[Foto]</span>}
                </div>
                <h3>
                  <WithPlaceholders text={text(m, "name", locale)} />
                </h3>
                <p className="muted">{text(m, "role", locale)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className={`band band-grass ${styles.cta}`} aria-labelledby="cta-title">
          <div>
            <h2 id="cta-title">{t("ctaTitle")}</h2>
            <p>{t("ctaText")}</p>
          </div>
          <div className="btn-row">
            <Link href="/book" className="btn btn-primary">
              {tc("bookCta")}
            </Link>
            <Link href="/contact" className="btn btn-secondary">
              {t("ctaQuestion")}
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
