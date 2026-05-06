/** @type {import('next').NextConfig} */
const path = require('path');
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'appi.caliptic.com',
        pathname: '/uploads/**',
      },
    ],
  },
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
  webpack: (config, { isServer, dev }) => {
    // Phaser ships an unminified `phaser/dist/phaser.js` (~3MB) as its main
    // entry. The package also includes a pre-minified `phaser.min.js` (~1MB).
    // Aliasing to the minified bundle in production client builds shrinks the
    // initial /battle payload dramatically and speeds up first cache-cold load.
    if (!isServer && !dev) {
      config.resolve = config.resolve || {};
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        phaser: 'phaser/dist/phaser.min.js',
      };

      // Isolate Phaser into its own cacheable chunk so it loads in parallel
      // with the route bundle and stays cached across deploys that do not
      // touch the Phaser version.
      config.optimization = config.optimization || {};
      config.optimization.splitChunks = config.optimization.splitChunks || {};
      const splitChunks = config.optimization.splitChunks;
      splitChunks.cacheGroups = {
        ...(splitChunks.cacheGroups || {}),
        phaser: {
          name: 'phaser',
          test: /[\\/]node_modules[\\/]phaser[\\/]/,
          chunks: 'async',
          priority: 30,
          reuseExistingChunk: true,
          enforce: true,
        },
      };
    }
    return config;
  },
};

module.exports = nextConfig;
