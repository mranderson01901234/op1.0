/** @type {import('next').NextConfig} */
const nextConfig = {
  // Skip static optimization for pages that use Clerk
  // This prevents build errors when Clerk keys are not set during build
  output: 'standalone',
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: true,
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    // Allow external image domains for CheerpX resources
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Disable static page generation for pages that might use Clerk
  experimental: {
    // Allow dynamic rendering
    optimizeCss: true,
  },
  // Headers for CheerpX SharedArrayBuffer support
  async headers() {
    return [
      {
        // Apply headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          },
        ],
      },
      {
        // Proper MIME types for WASM files
        source: '/:path*.wasm',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/wasm',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          },
        ],
      },
    ];
  },
  // Webpack configuration for CheerpX WASM support
  webpack: (config, { isServer }) => {
    // WASM support for CheerpX
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Handle .wasm files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    // Don't process CheerpX files on server side
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        '@leaningtech/cheerpx': '@leaningtech/cheerpx',
      });
    }

    return config;
  },
}

module.exports = nextConfig
