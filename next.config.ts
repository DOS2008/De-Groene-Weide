import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Minimal self-contained server for the production Docker image.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  // The e2e container reaches the dev server as http://web:3000.
  allowedDevOrigins: ["web"],
};

export default withNextIntl(nextConfig);
