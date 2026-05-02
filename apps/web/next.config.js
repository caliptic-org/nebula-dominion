/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [],
  // Phaser requires browser globals — exclude from SSR
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals ?? []), 'phaser'];
    }
    return config;
  },
};

module.exports = nextConfig;
