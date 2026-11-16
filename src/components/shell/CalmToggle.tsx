"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { MoonIcon } from "@/components/icons";
import { CALM_KEY } from "./calm";

const CHANGE = "gw-calm-change";

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE, onChange);
  return () => window.removeEventListener(CHANGE, onChange);
}

function isCalm() {
  return document.documentElement.dataset.calm === "true";
}

/**
 * The Rustknop: turns off motion and sound on the whole site. The choice is
 * kept in this browser only (strictly necessary, no cookie).
 */
export function CalmToggle({ long = false }: { long?: boolean }) {
  const t = useTranslations("calm");
  const calm = useSyncExternalStore(subscribe, isCalm, () => false);

  function toggle() {
    const next = !calm;
    if (next) document.documentElement.dataset.calm = "true";
    else delete document.documentElement.dataset.calm;
    try {
      localStorage.setItem(CALM_KEY, next ? "1" : "0");
    } catch {
      // Storage blocked: the setting still holds for this page view.
    }
    window.dispatchEvent(new Event(CHANGE));
  }

  return (
    <button
      type="button"
      className="btn btn-quiet"
      aria-pressed={calm}
      onClick={toggle}
    >
      <MoonIcon size={18} />
      {long ? t("long") : t("label")}
    </button>
  );
}
