import { createClient } from "@supabase/supabase-js";
import { supabaseServerUrl } from "./env";

/**
 * Service-role client: bypasses RLS. Only for background jobs (reminders,
 * retention, mail retries) and for inviting staff after the caller's admin
 * role was checked. Never use it to answer a guest or staff request directly.
 */
export function serviceDb() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(supabaseServerUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
