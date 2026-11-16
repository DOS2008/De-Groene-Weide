"use client";

import { useActionState, useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CheckIcon } from "@/components/icons";
import { limits, type ContactField } from "@/lib/contact";
import { sendContactMessage, type ContactState } from "./actions";
import styles from "./contact.module.css";

const initial: ContactState = { status: "idle" };

export function ContactForm() {
  const t = useTranslations("contact.form");
  const locale = useLocale();
  const [state, action, pending] = useActionState(sendContactMessage, initial);
  const shownAt = useRef<HTMLInputElement>(null);
  const summary = useRef<HTMLDivElement>(null);
  const sent = useRef<HTMLDivElement>(null);

  // Time stamp for the spam check, set in the browser after the form appears.
  useEffect(() => {
    if (shownAt.current) shownAt.current.value = String(Date.now());
  }, [state]);

  // Move focus to the result, so keyboard and screen reader users hear it.
  useEffect(() => {
    if (state.status === "error") summary.current?.focus();
    if (state.status === "sent") sent.current?.focus();
  }, [state]);

  if (state.status === "sent") {
    return (
      <div ref={sent} tabIndex={-1} className={`card ${styles.sent}`} role="status">
        <span className={styles.sentIcon}>
          <CheckIcon size={28} />
        </span>
        <div>
          <h2>{t("sentTitle")}</h2>
          <p>{t("sentText")}</p>
        </div>
      </div>
    );
  }

  const errors = state.status === "error" ? state.errors : {};
  const values = state.status === "error" ? state.values : undefined;
  const errorText = (field: ContactField) => (errors[field] ? t(`errors.${errors[field]}`) : null);
  const describedBy = (field: ContactField, hint?: string) =>
    [errors[field] ? `${field}-error` : null, hint].filter(Boolean).join(" ") || undefined;

  return (
    <form action={action} className={`card ${styles.form}`} aria-labelledby="form-title" noValidate>
      <h2 id="form-title">{t("title")}</h2>

      <div ref={summary} tabIndex={-1} aria-live="assertive" className={styles.summaryWrap}>
        {state.status === "error" ? (
          <p className={styles.summary}>
            {state.formError ? t(`errors.${state.formError}`) : t("errorSummary")}
          </p>
        ) : null}
      </div>

      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="shownAt" ref={shownAt} defaultValue="" />

      {/* Honeypot: hidden from people and screen readers, bots fill it in. */}
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="c-website">{t("website")}</label>
        <input id="c-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="c-name">{t("name")}</label>
          <input
            id="c-name"
            name="name"
            type="text"
            autoComplete="name"
            required
            maxLength={limits.name}
            defaultValue={values?.name}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={describedBy("name")}
          />
          {errorText("name") ? (
            <span id="name-error" className={styles.error}>
              {errorText("name")}
            </span>
          ) : null}
        </div>

        <div className={styles.field}>
          <label htmlFor="c-email">{t("email")}</label>
          <input
            id="c-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={limits.email}
            defaultValue={values?.email}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={describedBy("email", "email-hint")}
          />
          <span id="email-hint" className={styles.hint}>
            {t("emailHint")}
          </span>
          {errorText("email") ? (
            <span id="email-error" className={styles.error}>
              {errorText("email")}
            </span>
          ) : null}
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="c-subject">
          {t("subject")} <span className={styles.optional}>{t("optional")}</span>
        </label>
        <input
          id="c-subject"
          name="subject"
          type="text"
          maxLength={limits.subject}
          defaultValue={values?.subject}
          aria-invalid={errors.subject ? true : undefined}
          aria-describedby={describedBy("subject")}
        />
        {errorText("subject") ? (
          <span id="subject-error" className={styles.error}>
            {errorText("subject")}
          </span>
        ) : null}
      </div>

      <div className={styles.field}>
        <label htmlFor="c-message">{t("message")}</label>
        <textarea
          id="c-message"
          name="message"
          rows={6}
          required
          maxLength={limits.messageMax}
          defaultValue={values?.message}
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={describedBy("message", "message-hint")}
        />
        <span id="message-hint" className={styles.hint}>
          {t("messageHint")}
        </span>
        {errorText("message") ? (
          <span id="message-error" className={styles.error}>
            {errorText("message")}
          </span>
        ) : null}
      </div>

      <p className={styles.privacy}>
        {t("privacy")} <Link href="/privacy">{t("privacyLink")}</Link>
      </p>

      <div className={styles.submitRow}>
        <button type="submit" className="btn btn-primary" disabled={pending} aria-disabled={pending}>
          {pending ? t("sending") : t("submit")}
        </button>
        <span className={styles.hint}>{t("spamNote")}</span>
      </div>
    </form>
  );
}
