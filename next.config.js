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
  },
  // Disable static page generation for pages that might use Clerk
  experimental: {
    // Allow dynamic rendering
    optimizeCss: true,
  },
}

module.exports = nextConfig
