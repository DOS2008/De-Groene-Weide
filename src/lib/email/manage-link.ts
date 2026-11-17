import { createHash, createHmac } from "node:crypto";
import { getTranslations } from "next-intl/server";
import { routing, type AnyLocale } from "@/i18n/routing";
import { getPathname } from "@/i18n/navigation";
import { siteUrl } from "@/lib/seo";
import { serviceDb } from "@/lib/supabase/service";

/*
 * The guest's manage link (F4.6). The token is derived from the booking id
 * with a server secret, so every later email (confirmation by Bert, a
 * change, the reminder) can include the same link. The database only keeps
 * its sha256, so a database dump can't be turned into links.
 */

type LiveLocale = (typeof routing.locales)[number];

function secret(): string {
  const s = process.env.MANAGE_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("MANAGE_LINK_SECRET is not set");
  return s;
}

/** 48 hex characters, the length the database functions expect. */
export function manageToken(reservationId: string): string {
  return createHmac("sha256", secret()).update(`manage:${reservationId}`).digest("hex").slice(0, 48);
}

export function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function live(locale: AnyLocale): LiveLocale {
  return ((routing.locales as readonly string[]).includes(locale) ? locale : "nl") as LiveLocale;
}

export function manageUrl(token: string, locale: AnyLocale): string {
  return `${siteUrl()}${getPathname({ href: { pathname: "/my-booking/[token]", params: { token } }, locale: live(locale) })}`;
}

/**
 * The paragraph with the link, for a booking email. Makes sure the stored
 * hash matches first (older bookings had a random token); without that the
 * mail goes out without a link rather than with a broken one.
 */
export async function manageLinkFor(reservationId: string, locale: AnyLocale): Promise<string[]> {
  try {
    const token = manageToken(reservationId);
    const { error } = await serviceDb()
      .from("reservations")
      .update({ manage_token_hash: tokenHash(token) })
      .eq("id", reservationId);
    if (error) throw new Error(error.message);
    const t = await getTranslations({ locale: live(locale), namespace: "email" });
    return [t("manage", { url: manageUrl(token, locale) })];
  } catch (e) {
    console.error("manage link:", e instanceof Error ? e.message : e);
    return [];
  }
}
