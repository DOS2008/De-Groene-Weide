"use client";

import { useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { CloseIcon, MenuIcon } from "@/components/icons";
import { CalmToggle } from "./CalmToggle";
import { mainNav } from "./nav-items";
import styles from "./SiteHeader.module.css";

/** Menu button with a full-width panel, for phone and tablet widths. */
export function MobileMenu() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) button.current?.focus();
  }

  return (
    <div className={styles.mobile}>
      <button
        ref={button}
        type="button"
        className={`btn btn-quiet ${styles.menuButton}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
        {open ? t("closeMenu") : t("openMenu")}
      </button>
      <div
        id={panelId}
        className={styles.panel}
        hidden={!open}
        onKeyDown={(e) => {
          if (e.key === "Escape") close(true);
        }}
      >
        <nav aria-label={t("label")}>
          <ul>
            {mainNav.map((item) => (
              <li key={item.route}>
                <Link
                  href={item.route}
                  className={styles.panelLink}
                  aria-current={pathname === item.route ? "page" : undefined}
                  onClick={() => close(false)}
                >
                  {t(item.label)}
                  <span aria-hidden="true">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className={styles.panelTools}>
          <CalmToggle long />
        </div>
      </div>
    </div>
  );
}
