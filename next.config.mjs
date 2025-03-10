/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep the type checking and linting configuration from next.config.ts
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Add optimizations for Cloudflare Pages
  output: 'standalone', // Creates a more optimized production build
  
  // Minimize output size
  swcMinify: true,
  
  // Configure webpack to reduce bundle size
  webpack: (config, { isServer }) => {
    // Optimize bundle size
    config.optimization.minimize = true;
    
    // Exclude large packages from the client bundle if possible
    if (!isServer) {
      // Keep this light - Cloudflare has file size limits
      config.optimization.splitChunks = {
        chunks: 'all',
        maxSize: 20 * 1024 * 1024, // 20MB max chunk size
      };
    }
    
    return config;
  },
  
  // Exclude development-only functionality from production builds
  experimental: {
    turbotrace: {
      // Analyze and reduce traces
      memoryLimit: 4 * 1024, // 4GB memory limit
    },
  },
};

export default nextConfig; 