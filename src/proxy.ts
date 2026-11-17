import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./i18n/routing";
import { AUTH_COOKIE, supabaseAnonKey, supabaseServerUrl } from "./lib/supabase/env";

// Maps public URLs (/reserveren) to the internal routes (/nl/book).
const intl = createMiddleware(routing);

/** Pages a staff member may see before passing 2FA. */
const BEFORE_LOGIN = ["/admin/login"];
const BEFORE_2FA = ["/admin/2fa"];

/**
 * The admin panel: refresh the staff session and send anyone without a
 * second factor to the login or the code page. This is only the front
 * door: RLS in the database refuses staff data without aal2 anyway.
 */
async function adminGate(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseServerUrl(), supabaseAnonKey(), {
    cookieOptions: { name: AUTH_COOKIE, sameSite: "lax", secure: process.env.NODE_ENV === "production" },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  const path = request.nextUrl.pathname;
  const { data } = await supabase.auth.getUser();
  const redirect = (to: string) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = "";
    const r = NextResponse.redirect(url);
    for (const c of response.cookies.getAll()) r.cookies.set(c);
    return r;
  };

  if (!data.user) {
    return BEFORE_LOGIN.some((p) => path.startsWith(p)) ? response : redirect("/admin/login");
  }
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== "aal2") {
    return BEFORE_2FA.some((p) => path.startsWith(p)) || path.startsWith("/admin/login")
      ? response
      : redirect("/admin/2fa");
  }
  if (BEFORE_LOGIN.some((p) => path.startsWith(p)) || BEFORE_2FA.some((p) => path.startsWith(p))) {
    return redirect("/admin");
  }
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export default function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin" || request.nextUrl.pathname.startsWith("/admin/")) {
    return adminGate(request);
  }
  return intl(request);
}

export const config = {
  // Skip Next internals, API routes and files with an extension
  // (robots.txt, sitemap.xml, images).
  // The double backslash matters: "\\." is a literal dot in the pattern.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
