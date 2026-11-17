/**
 * Where server code reaches Supabase. Inside Docker that is the internal
 * gateway (SUPABASE_URL, http://api-gw:8000); the browser uses
 * NEXT_PUBLIC_SUPABASE_URL. Never import this from a "use client" file.
 */
export function supabaseServerUrl(): string {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("SUPABASE_URL is not set");
  return url;
}

export function supabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set");
  return key;
}

/** Public URL of a file in the public "media" storage bucket. */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base ? `${base}/storage/v1/object/public/media/${path}` : null;
}

/** Same cookie name on every host, so the internal URL doesn't change it. */
export const AUTH_COOKIE = "sb-groene-weide-auth";
