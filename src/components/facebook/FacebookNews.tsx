import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locale";
import { excerpt, getFacebookPosts } from "@/lib/data/facebook";
import { getSite } from "@/lib/data/content";
import { FacebookPhoto } from "./FacebookPhoto";
import styles from "./FacebookNews.module.css";

/** "Nieuws van het erf": the latest posts, or a link to the page as a fallback. */
export async function FacebookNews({ locale }: { locale: Locale }) {
  const [posts, site] = await Promise.all([getFacebookPosts(), getSite()]);
  if (!posts?.length && !site.facebookUrl) return null;
  const t = await getTranslations("home");
  const tc = await getTranslations("common");
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", timeZone: "Europe/Amsterdam" }).format(new Date(iso));

  return (
    <section className="container section" aria-labelledby="facebook-title">
      <div className="section-head">
        <h2 id="facebook-title">{t("facebookTitle")}</h2>
      </div>
      {posts?.length ? (
        <ul className={styles.list}>
          {posts.map((p) => (
            <li key={p.id} className={`card ${styles.post}`}>
              {p.image && <FacebookPhoto src={p.image} />}
              <time dateTime={p.createdTime}>{date(p.createdTime)}</time>
              <p>{excerpt(p.message)}</p>
              <a href={p.url} rel="noopener" target="_blank">
                {t("facebookMore")}
                <span className="visually-hidden"> ({tc("newWindow")})</span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p>{t("facebookFallback")}</p>
      )}
      {site.facebookUrl && (
        <div className="btn-row">
          <a href={site.facebookUrl} rel="noopener" target="_blank" className="btn btn-secondary">
            {t("facebookFollow")}
            <span className="visually-hidden"> ({tc("newWindow")})</span>
          </a>
        </div>
      )}
    </section>
  );
}
