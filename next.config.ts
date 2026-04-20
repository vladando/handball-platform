// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "minio" },
      { protocol: "https", hostname: "**" },
    ],
  },
  experimental: {
    serverActions: {
      // Allow Server Actions from localhost (dev) and the production domain.
      // NEXT_PUBLIC_APP_URL must be set in your .env on the server, e.g.:
      //   NEXT_PUBLIC_APP_URL=https://handballhub.net
      allowedOrigins: [
        "localhost:3000",
        "localhost:3001",
        ...(process.env.NEXT_PUBLIC_APP_URL
          ? [new URL(process.env.NEXT_PUBLIC_APP_URL).host]
          : []),
      ],
    },
  },
};

export default nextConfig;
