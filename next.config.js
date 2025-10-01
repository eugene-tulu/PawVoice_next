// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ⚠️ Allows production builds to succeed even if ESLint has errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // ⚠️ Allows production builds to succeed even if TypeScript has errors
    ignoreBuildErrors: true,
  },
};

export default nextConfig;