/** @type {import('next').NextConfig} */
const path = require('path');
const nextConfig = {
  output: 'standalone',
  // Phaser 3 is not compatible with React StrictMode: the double-invoke of
  // useEffect destroys the Phaser game before the second invocation can
  // restart it (containerRef.current is null at that point). Disable to let
  // GameCanvas.tsx initialise the canvas reliably in both dev and test.
  reactStrictMode: false,
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
  env: {
    NEXT_PUBLIC_GAME_SERVER_URL: process.env.NEXT_PUBLIC_GAME_SERVER_URL || 'http://localhost:3001',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  },
};

module.exports = nextConfig;
