import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Chicken } from "@/components/Chicken";
import styles from "./error-page.module.css";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <div className={`container section ${styles.page}`}>
      <title>{t("metaTitle")}</title>
      <Chicken size={180} className={styles.chicken} />
      <div className="stack">
        <span className="eyebrow">{t("eyebrow")}</span>
        <h1>{t("title")}</h1>
        <p className="lead">{t("text")}</p>
        <div className="btn-row">
          <Link href="/" className="btn btn-primary">
            {t("home")}
          </Link>
          <Link href="/site-map" className="btn btn-secondary">
            {t("map")}
          </Link>
        </div>
      </div>
    </div>
  );
}
