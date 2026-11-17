import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { AUTH_COOKIE, supabaseAnonKey, supabaseServerUrl } from "./env";

/**
 * Client for the admin panel, acting as the signed-in staff member. Every
 * query runs under their JWT, so RLS decides what they may see and change.
 */
export async function staffDb() {
  const store = await cookies();
  return createServerClient(supabaseServerUrl(), supabaseAnonKey(), {
    cookieOptions: { name: AUTH_COOKIE, sameSite: "lax", secure: process.env.NODE_ENV === "production" },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Called from a server component: the proxy refreshes the session.
        }
      },
    },
  });
}
