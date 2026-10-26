import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  devIndicators: false,
  distDir: process.env.TAXSKILL_BUILD_PROFILE === "h09" ? ".next-h09" : ".next",
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
