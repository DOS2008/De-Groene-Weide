import { createClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseServerUrl } from "./env";

/**
 * Anonymous client for public data and the guest booking functions. It has
 * no session: RLS treats every call as a guest (role anon).
 */
export function publicDb() {
  return createClient(supabaseServerUrl(), supabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
