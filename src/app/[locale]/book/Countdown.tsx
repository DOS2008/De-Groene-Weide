"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import styles from "./flow.module.css";

/**
 * Time left on the hold. Announces politely once, at 2 minutes, and calls
 * onExpire when the time is up. The visible clock itself is not announced
 * every second: that would drown out a screen reader.
 */
export function Countdown({
  heldUntil,
  plotId,
  onExpire,
}: {
  heldUntil: string;
  plotId: string;
  onExpire: () => void;
}) {
  const t = useTranslations("booking");
  const [now, setNow] = useState(() => Date.now());
  const warned = useRef(false);
  const [warning, setWarning] = useState("");
  const expired = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const left = Math.max(0, Date.parse(heldUntil) - now);

  useEffect(() => {
    if (left <= 120_000 && left > 0 && !warned.current) {
      warned.current = true;
      const id = window.setTimeout(() => setWarning(t("countdownWarning", { id: plotId })), 0);
      return () => window.clearTimeout(id);
    }
    if (left === 0 && !expired.current) {
      expired.current = true;
      onExpire();
    }
  }, [left, onExpire, plotId, t]);

  const minutes = Math.floor(left / 60_000);
  const seconds = Math.floor((left % 60_000) / 1000);
  const time = `${minutes}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className={`${styles.countdown} ${left <= 120_000 ? styles.countdownLow : ""}`}>
      <span>{t("countdown", { time })}</span>
      <span className="visually-hidden" aria-live="polite">
        {warning}
      </span>
    </div>
  );
}
