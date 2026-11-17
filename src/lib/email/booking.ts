import { getTranslations } from "next-intl/server";
import type { AnyLocale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";
import { formatDate } from "@/lib/dates";
import { nightCount } from "@/lib/booking-rules";
import { contactRecipient, sendMail, type Mail } from "@/lib/mail";
import { siteUrl } from "@/lib/seo";

/**
 * Booking emails (F4.5). Each one is written in the booking's own language
 * (reservations.locale), whatever language the sender uses.
 */

export type MailBooking = {
  code: string;
  plotId: string;
  arrival: string;
  departure: string;
  adults: number;
  children: number;
  name: string;
  email: string | null;
  phone: string | null;
  remarks: string | null;
  locale: AnyLocale;
  priceTotal: number | null;
  status: "requested" | "confirmed" | "cancelled";
};

export type GuestMailKind = "requested" | "confirmed" | "cancelled" | "reminder" | "farewell";

/** Email can't read CSS variables; these mirror the Stijlgids tokens. */
const palette = { ink: "#1e2a21", green: "#2f6b3e", milk: "#fbfaf6", straw: "#f2e8dc", border: "#d9ddd3" };

/** A language we can write in: the booking's, or Dutch while it isn't live. */
type LiveLocale = (typeof routing.locales)[number];

function mailLocale(locale: AnyLocale): LiveLocale {
  return (routing.locales as readonly string[]).includes(locale) ? (locale as LiveLocale) : "nl";
}

function escape(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

const CHICKEN = `<svg viewBox="0 0 120 120" width="64" height="64" aria-hidden="true"><path d="M30 70 C30 45 50 32 66 36 C70 24 86 22 92 34 C100 50 98 84 72 92 C50 98 30 90 30 70 Z" fill="#fff" stroke="#3b2a1a" stroke-width="5"/><path d="M76 27 C73 18 80 13 84 20 C86 12 95 14 92 25" fill="#ee8a3c" stroke="#3b2a1a" stroke-width="4"/><path d="M96 40 L108 44 L96 48 Z" fill="#f5c84b" stroke="#3b2a1a" stroke-width="4"/><circle cx="86" cy="38" r="4" fill="#3b2a1a"/></svg>`;

/** Plain text plus a simple HTML version with the chicken. */
export function layout(paragraphs: string[], locale: AnyLocale): Pick<Mail, "text" | "html"> {
  const text = paragraphs.join("\n\n");
  const html = `<!doctype html><html lang="${locale}"><body style="margin:0;background:${palette.milk};font-family:Verdana,Arial,sans-serif;color:${palette.ink};font-size:17px;line-height:1.6">
<div style="max-width:560px;margin:0 auto;padding:24px">
<div style="background:#fff;border:1px solid ${palette.border};border-radius:20px;padding:24px">
${CHICKEN}
${paragraphs
  .map((p) => `<p style="margin:0 0 16px">${escape(p).replace(/\n/g, "<br>").replace(/(https?:\/\/\S+)/g, `<a href="$1" style="color:${palette.green}">$1</a>`)}</p>`)
  .join("\n")}
</div>
<p style="font-size:14px;color:#4b574e;text-align:center">De Groene Weide</p>
</div></body></html>`;
  return { text, html };
}

async function summary(b: MailBooking, locale: LiveLocale) {
  const t = await getTranslations({ locale, namespace: "email" });
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" });
  const date = (d: string) => formatDate(d, locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return [
    t("summaryTitle"),
    [
      t("code", { code: b.code }),
      t("plot", { plot: b.plotId }),
      t("dates", { arrival: date(b.arrival), departure: date(b.departure), nights: nightCount(b.arrival, b.departure) }),
      t("persons", { adults: b.adults, children: b.children }),
      b.priceTotal === null ? t("priceUnknown") : t("price", { price: money.format(b.priceTotal) }),
    ].join("\n"),
  ];
}

/** Builds a guest email. `extra` adds paragraphs (manage link, route, review). */
export async function guestMail(kind: GuestMailKind, b: MailBooking, extra: string[] = []): Promise<Mail | null> {
  if (!b.email) return null;
  const locale = mailLocale(b.locale);
  const t = await getTranslations({ locale, namespace: "email" });
  const days = Math.max(0, nightCount(new Date().toISOString().slice(0, 10), b.arrival));
  const subject = t(`${kind}.subject`, { plot: b.plotId, code: b.code, days });
  const body = [
    t("greeting", { name: b.name }),
    t(`${kind}.intro`),
    ...(kind === "farewell" ? [] : await summary(b, locale)),
    ...extra,
    t("contactUs"),
    t("signoff"),
  ];
  return { to: b.email, replyTo: contactRecipient(), subject, ...layout(body, locale) };
}

/** Notice to Bert about a new booking from the website. Always in Dutch. */
export async function noticeMail(b: MailBooking): Promise<Mail> {
  const t = await getTranslations({ locale: "nl", namespace: "email" });
  const date = (d: string) => formatDate(d, "nl", { weekday: "short", day: "numeric", month: "short" });
  const body = [
    t("notice.intro"),
    ...(await summary(b, "nl")),
    b.status === "confirmed" ? t("notice.confirmed") : t("notice.requested", { url: `${siteUrl()}/admin/bookings` }),
    t("notice.contact", { name: b.name, email: b.email ?? "", phone: b.phone ? `, ${b.phone}` : "" }),
    ...(b.remarks ? [t("notice.remarks", { remarks: b.remarks })] : []),
    t("notice.language", { locale: b.locale.toUpperCase() }),
  ];
  return {
    to: contactRecipient(),
    replyTo: b.email ?? undefined,
    subject: t("notice.subject", { plot: b.plotId, arrival: date(b.arrival) }),
    ...layout(body, "nl"),
  };
}

/** Sends, and logs instead of throwing: a booking never fails on email. */
export async function deliver(mail: Mail | null): Promise<boolean> {
  if (!mail) return true;
  try {
    await sendMail(mail);
    return true;
  } catch (e) {
    console.error("mail failed:", mail.subject, e);
    return false;
  }
}
