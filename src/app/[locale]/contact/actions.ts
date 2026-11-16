"use server";

import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import {
  looksLikeSpam,
  readContactForm,
  validateContact,
  type ContactErrorKey,
  type ContactField,
  type ContactInput,
} from "@/lib/contact";
import { contactRecipient, sendMail } from "@/lib/mail";
import { createRateLimit } from "@/lib/rate-limit";

export type ContactState =
  | { status: "idle" }
  | { status: "sent" }
  | {
      status: "error";
      errors: Partial<Record<ContactField, ContactErrorKey>>;
      formError?: "rateLimited" | "sendFailed";
      values: ContactInput;
    };

// 5 messages per visitor per 15 minutes.
const allow = createRateLimit({ limit: 5, windowMs: 15 * 60 * 1000 });

async function visitorKey() {
  const h = await headers();
  // Caddy sets X-Forwarded-For on the server. Only used for the rate limit, never stored.
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export async function sendContactMessage(_prev: ContactState, form: FormData): Promise<ContactState> {
  const values = readContactForm(form);

  // Bots get the normal success message, so they learn nothing.
  if (looksLikeSpam(form, Date.now())) return { status: "sent" };

  const errors = validateContact(values);
  if (Object.keys(errors).length > 0) return { status: "error", errors, values };

  if (!allow(await visitorKey())) {
    return { status: "error", errors: {}, formError: "rateLimited", values };
  }

  const localeValue = form.get("locale");
  const locale = routing.locales.find((l) => l === localeValue) ?? routing.defaultLocale;
  // The mail to Bert is always in Dutch; the admin side is Dutch only.
  const t = await getTranslations({ locale: "nl", namespace: "contact.form" });

  try {
    await sendMail({
      to: contactRecipient(),
      replyTo: values.email,
      subject: `Nieuw bericht via de website${values.subject ? `: ${values.subject}` : ""}`,
      text: [
        `${t("name")}: ${values.name}`,
        `${t("email")}: ${values.email}`,
        `Taal van de site: ${locale}`,
        "",
        values.message,
      ].join("\n"),
    });
  } catch (error) {
    // Log the failure, never the message or the sender's details.
    console.error("Contact mail failed:", error instanceof Error ? error.message : error);
    return { status: "error", errors: {}, formError: "sendFailed", values };
  }

  return { status: "sent" };
}
