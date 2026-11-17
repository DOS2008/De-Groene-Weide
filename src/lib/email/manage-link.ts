import type { AnyLocale } from "@/i18n/routing";

/**
 * The paragraph with the guest's manage link. Prio 3 has no manage page
 * yet (guests cancel by contacting Bert), so it adds nothing; Prio 6 fills
 * this in.
 */
export async function manageLinkParagraph(token: string | undefined, locale: AnyLocale): Promise<string[]> {
  void token;
  void locale;
  return [];
}
