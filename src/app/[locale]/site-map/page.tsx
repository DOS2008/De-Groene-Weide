import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getPageLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { facilities } from "@/content/facilities";
import { plotTypes } from "@/content/plots";
import { FacilityIconFor } from "@/components/icons";
import { PageIntro } from "@/components/PageIntro";
import { WithPlaceholders } from "@/components/Placeholder";
import { SiteMapDrawing } from "@/components/SiteMapDrawing";
import { text } from "@/lib/localized";
import { pageMetadata } from "@/lib/seo";
import styles from "./site-map.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPageLocale();
  const t = await getTranslations("siteMap");
  return pageMetadata({
    route: "/site-map",
    locale,
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default async function SiteMapPage() {
  const locale = await getPageLocale();
  const t = await getTranslations("siteMap");
  const ta = await getTranslations("activities");
  const name = (id: string) => {
    const f = facilities.find((x) => x.id === id);
    return f ? text(f, "name", locale) : id;
  };

  return (
    <div className="container section">
      <div className="section-head">
        <PageIntro eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
        <Link href="/book" className="btn btn-primary">
          {t("cta")}
        </Link>
      </div>

      <figure className={styles.map}>
        <div className={styles.scroll}>
          <SiteMapDrawing
            label={t("mapLabel")}
            labels={{
              zoneA: t("zoneA"),
              zoneB: t("zoneB"),
              zoneC: t("zoneC"),
              zoneS: t("zoneS"),
              entrance: t("entrance"),
              playground: name("speelweide"),
              chickens: name("kippen"),
              canteen: name("kantine"),
              sanitary: name("sanitair"),
              pool: name("zwembad"),
              reception: name("winkeltje"),
            }}
          />
        </div>
        <figcaption className="muted small">{t("draftNote")}</figcaption>
      </figure>

      <div className={styles.lists}>
        <section aria-labelledby="facilities-title">
          <h2 id="facilities-title">{t("facilitiesTitle")}</h2>
          <ul className={styles.items}>
            {facilities.map((f) => (
              <li key={f.id} id={f.id} className={styles.item}>
                <span className={styles.icon}>
                  <FacilityIconFor icon={f.icon} size={26} />
                </span>
                <div className={styles.itemText}>
                  <h3>{text(f, "name", locale)}</h3>
                  <p>
                    <strong>{t("where")}</strong> {text(f, "location", locale)}
                  </p>
                  <p>
                    <strong>{f.hoursLabel === "when" ? ta("when") : ta("open")}</strong>{" "}
                    <WithPlaceholders text={text(f, "hours", locale)} />
                  </p>
                  <p>
                    <strong>{ta("access")}</strong> <WithPlaceholders text={text(f, "access", locale)} />
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="plots-title">
          <h2 id="plots-title">{t("plotsTitle")}</h2>
          <p className="muted">{t("plotsText")}</p>
          <ul className={styles.items}>
            {plotTypes.map((p) => (
              <li key={p.id} className={styles.item}>
                <span className={styles.plotBadge} aria-hidden="true">
                  {p.prefix}
                </span>
                <div className={styles.itemText}>
                  <h3>{text(p, "name", locale)}</h3>
                  <p>
                    {t("plotsRange", { prefix: p.prefix, count: p.count })} · {t("plotCount", { count: p.count })}
                  </p>
                  <p className="muted">{text(p, "description", locale)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
