"use client";

import { useTranslations } from "next-intl";
import { useExtrasConsent } from "@/components/shell/CookieBanner";
import styles from "./FacebookNews.module.css";

/**
 * A Facebook photo comes from Facebook's servers, so it only loads after
 * the visitor allowed "extras" in the cookie settings.
 */
export function FacebookPhoto({ src }: { src: string }) {
  const t = useTranslations("home");
  const allowed = useExtrasConsent();
  if (!allowed) return <p className={styles.photoOff}>{t("facebookPhotosOff")}</p>;
  // eslint-disable-next-line @next/next/no-img-element -- remote photo, shown only with consent
  return <img src={src} alt="" className={styles.photo} loading="lazy" referrerPolicy="no-referrer" />;
}
