import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  devIndicators: false,
  turbopack: { root: process.cwd() },
  distDir:
    process.env.TAXSKILL_BUILD_PROFILE === "h10"
      ? ".next-h10"
      : process.env.TAXSKILL_BUILD_PROFILE === "h09"
        ? ".next-h09"
        : ".next",
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
