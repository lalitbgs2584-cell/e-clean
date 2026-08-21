import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/ui", "db"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "d2w3a7ppii0a0i.cloudfront.net",
      },
    ],
  },

};

export default nextConfig;
