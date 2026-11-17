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
  experimental: {
    // Photo uploads in the admin panel (cropped and resized in the browser first).
    serverActions: { bodySizeLimit: "11mb" },
  },
};

export default withNextIntl(nextConfig);
