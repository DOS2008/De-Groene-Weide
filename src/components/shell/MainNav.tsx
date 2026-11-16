"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { mainNav } from "./nav-items";
import styles from "./SiteHeader.module.css";

export function MainNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  return (
    <nav aria-label={t("label")} className={styles.desktopNav}>
      <ul>
        {mainNav.map((item) => (
          <li key={item.route}>
            <Link
              href={item.route}
              className={styles.navLink}
              aria-current={pathname === item.route ? "page" : undefined}
            >
              {t(item.label)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
