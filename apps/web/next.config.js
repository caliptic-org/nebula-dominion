/** @type {import('next').NextConfig} */
const path = require('path');
const nextConfig = {
  output: 'standalone',
  typescript: { ignoreBuildErrors: true },
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
  env: {
    NEXT_PUBLIC_GAME_SERVER_URL: process.env.NEXT_PUBLIC_GAME_SERVER_URL || 'http://localhost:3001',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
};

module.exports = nextConfig;
