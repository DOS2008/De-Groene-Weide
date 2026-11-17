"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import styles from "./CookieBanner.module.css";

/** Consent is kept in this browser only. Bump the version when the choices change. */
const KEY = "gw-consent-v1";
const CHANGE = "gw-consent-change";
const OPEN = "gw-consent-open";

export type Consent = { extras: boolean; savedAt: string };

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return "unavailable"; // storage blocked: don't nag on every page
  }
}

/** The stored choice, or null if there is none (yet). For other components. */
export function readConsent(): Consent | null {
  const raw = readRaw();
  if (!raw || raw === "unavailable") return null;
  try {
    return JSON.parse(raw) as Consent;
  } catch {
    return null;
  }
}

/** True once this visitor allowed "extras" (e.g. Facebook photos). */
export function useExtrasConsent(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => readConsent()?.extras ?? false,
    () => false,
  );
}

/**
 * Cookie banner. Non-essential extras are off by default and only switch
 * on after an explicit choice. Not modal: the page stays usable.
 */
export function CookieBanner() {
  const t = useTranslations("cookies");
  const raw = useSyncExternalStore(subscribe, readRaw, () => "server");
  const [reopened, setReopened] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [extras, setExtras] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const extrasId = useId();

  useEffect(() => {
    function onOpen() {
      returnFocus.current = document.activeElement as HTMLElement | null;
      setExtras(readConsent()?.extras ?? false);
      setChoosing(true);
      setReopened(true);
      requestAnimationFrame(() => heading.current?.focus());
    }
    window.addEventListener(OPEN, onOpen);
    return () => window.removeEventListener(OPEN, onOpen);
  }, []);

  const visible = raw === null || reopened;
  if (!visible) return null;

  function save(choice: boolean) {
    const consent: Consent = { extras: choice, savedAt: new Date().toISOString() };
    try {
      localStorage.setItem(KEY, JSON.stringify(consent));
    } catch {
      // Storage blocked: the banner closes for this page view.
    }
    window.dispatchEvent(new Event(CHANGE));
    setReopened(false);
    setChoosing(false);
    returnFocus.current?.focus();
  }

  return (
    <section className={styles.banner} aria-labelledby={titleId}>
      <h2 id={titleId} ref={heading} tabIndex={-1} className={styles.title}>
        {t("title")}
      </h2>
      <p>{t("text")}</p>

      {choosing ? (
        <form
          className={styles.choices}
          onSubmit={(e) => {
            e.preventDefault();
            save(extras);
          }}
        >
          <div className={styles.choice}>
            <input type="checkbox" checked disabled id={`${extrasId}-needed`} />
            <label htmlFor={`${extrasId}-needed`}>
              <strong>{t("needed")}</strong>
              <span>{t("neededHint")}</span>
            </label>
          </div>
          <div className={styles.choice}>
            <input
              type="checkbox"
              id={extrasId}
              checked={extras}
              onChange={(e) => setExtras(e.target.checked)}
            />
            <label htmlFor={extrasId}>
              <strong>{t("extras")}</strong>
              <span>{t("extrasHint")}</span>
            </label>
          </div>
          <div className="btn-row">
            <button type="submit" className="btn btn-primary">
              {t("save")}
            </button>
          </div>
        </form>
      ) : (
        <div className="btn-row">
          <button type="button" className="btn btn-primary" onClick={() => save(false)}>
            {t("onlyNeeded")}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setChoosing(true)}>
            {t("choose")}
          </button>
        </div>
      )}

      <Link href="/privacy" className={styles.more}>
        {t("readMore")}
      </Link>
    </section>
  );
}

/** Footer button that opens the banner again to change the choice. */
export function CookieSettingsButton({ className }: { className?: string }) {
  const t = useTranslations("footer");
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new Event(OPEN))}
    >
      {t("cookieSettings")}
    </button>
  );
}
