import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/ui", "db"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "d9mqkyqp68eq0.cloudfront.net",
      },
    ],
  },

};

export default nextConfig;
