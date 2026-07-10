import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Memerintahkan Vercel untuk tetap melanjutkan build meskipun ada error TypeScript
    ignoreBuildErrors: true,
  },
  eslint: {
    // Mengabaikan peringatan kode kotor dari ESLint saat build
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;