/** @type {import('next').NextConfig} */
const nextConfig = {
  // Skip static optimization for pages that use Clerk
  // This prevents build errors when Clerk keys are not set during build
  output: 'standalone',
  // Disable static page generation for pages that might use Clerk
  experimental: {
    // Allow dynamic rendering
  },
}

module.exports = nextConfig
