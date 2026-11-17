"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { cancelOwnBooking, type CancelState } from "./actions";
import styles from "./manage.module.css";

export function CancelForm({ token }: { token: string }) {
  const t = useTranslations("manage");
  const [state, action, pending] = useActionState<CancelState, FormData>(cancelOwnBooking, {});

  if (state.status === "cancelled") {
    return (
      <p role="status" className={styles.ok}>
        {t("cancelled")}
      </p>
    );
  }
  return (
    <form action={action} className="stack">
      <input type="hidden" name="token" value={token} />
      <label className={styles.check}>
        <input type="checkbox" name="sure" required /> {t("cancelCheck")}
      </label>
      <div aria-live="polite">
        {state.status === "unchecked" && <p className={styles.error}>{t("cancelNeedsCheck")}</p>}
        {(state.status === "error" || state.status === "not_found" || state.status === "too_late") && (
          <p className={styles.error}>{t("cancelError")}</p>
        )}
      </div>
      <div className="btn-row">
        <button type="submit" className="btn btn-ink" disabled={pending}>
          {pending ? t("cancelBusy") : t("cancelButton")}
        </button>
      </div>
    </form>
  );
}
