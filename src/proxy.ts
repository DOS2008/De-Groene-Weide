import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Maps public URLs (/reserveren) to the internal routes (/nl/book).
export default createMiddleware(routing);

export const config = {
  // Skip Next internals, API routes and files with an extension
  // (robots.txt, sitemap.xml, images).
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
