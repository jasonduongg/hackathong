import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // Add experimental features to help with chunk loading
  experimental: {
    optimizePackageImports: ['next-themes'],
  },
  // Increase chunk loading timeout
  webpack: (config, { dev, isServer }) => {
    if (!isServer && dev) {
      config.watchOptions = {
        ...config.watchOptions,
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
  // Configure API routes to handle larger request bodies
  api: {
    bodyParser: {
      sizeLimit: '50mb', // Increase from default 1mb to 50mb
    },
    responseLimit: '50mb', // Increase response limit as well
  },
};

export default nextConfig;
