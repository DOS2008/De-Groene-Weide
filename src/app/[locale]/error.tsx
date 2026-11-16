"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Chicken } from "@/components/Chicken";
import styles from "./error-page.module.css";

// The friendly 500 page.
export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  const t = useTranslations("error");
  return (
    <div className={`container section ${styles.page}`}>
      <Chicken size={180} className={styles.chicken} />
      <div className="stack">
        <span className="eyebrow">{t("eyebrow")}</span>
        <h1>{t("title")}</h1>
        <p className="lead">{t("text")}</p>
        <div className="btn-row">
          <button type="button" className="btn btn-primary" onClick={() => retry()}>
            {t("retry")}
          </button>
          <Link href="/" className="btn btn-secondary">
            {t("home")}
          </Link>
        </div>
      </div>
    </div>
  );
}
