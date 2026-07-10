import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Memerintahkan Vercel untuk tetap melanjutkan build meskipun ada error TypeScript
    ignoreBuildErrors: true,
  },
};

export default nextConfig;