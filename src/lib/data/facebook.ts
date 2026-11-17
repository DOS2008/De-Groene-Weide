import { cacheLife, cacheTag } from "next/cache";
import { publicDb } from "@/lib/supabase/public";

/**
 * Bert's latest Facebook posts (F7.4), fetched on the server through the
 * Graph API and cached for an hour. Visitors never load anything from
 * Facebook for the text; photos only show after they allow "extras".
 * Returns null when it isn't set up or Facebook doesn't answer: the site
 * then simply links to the page.
 */

export type FacebookPost = { id: string; message: string; createdTime: string; url: string; image: string | null };

const GRAPH = process.env.FACEBOOK_GRAPH_VERSION || "v23.0";

export async function getFacebookPosts(): Promise<FacebookPost[] | null> {
  "use cache";
  cacheTag("facebook", "settings");
  cacheLife("hours");
  const token = process.env.FACEBOOK_PAGE_TOKEN;
  if (!token) return null;
  try {
    const { data } = await publicDb().from("settings").select("value").eq("key", "facebook_page_id").maybeSingle();
    const page = typeof data?.value === "string" ? data.value : null;
    if (!page || !/^[A-Za-z0-9.]+$/.test(page)) return null;
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH}/${encodeURIComponent(page)}/posts?fields=message,created_time,permalink_url,full_picture&limit=6`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) {
      console.error("facebook:", res.status);
      return null;
    }
    const json = (await res.json()) as {
      data?: { id: string; message?: string; created_time: string; permalink_url?: string; full_picture?: string }[];
    };
    return (json.data ?? [])
      .filter((p) => p.message && p.permalink_url?.startsWith("https://"))
      .slice(0, 3)
      .map((p) => ({
        id: p.id,
        message: p.message!,
        createdTime: p.created_time,
        url: p.permalink_url!,
        image: p.full_picture?.startsWith("https://") ? p.full_picture : null,
      }));
  } catch (e) {
    console.error("facebook:", e instanceof Error ? e.message : e);
    return null;
  }
}

/** The first sentences, at most `max` characters, cut at a word. */
export function excerpt(text: string, max = 220): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 30)).trim()}…`;
}
