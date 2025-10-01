/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ← skip eslint block
  },
  typescript: {
    ignoreBuildErrors: true,  // ← skip type block
  },
};

module.exports = nextConfig;