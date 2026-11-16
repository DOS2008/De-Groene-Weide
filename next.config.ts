import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Minimal self-contained server for the production Docker image.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
