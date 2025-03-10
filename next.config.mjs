/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep the type checking and linting configuration
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Use output: 'export' in static mode, or 'standalone' in server mode 
  output: process.env.NEXT_STATIC_EXPORT ? 'export' : 'standalone',
  
  // Disable image optimization (use optimized images directly)
  images: {
    unoptimized: true,
  },
  
  // Configure webpack to reduce bundle size
  webpack: (config, { isServer }) => {
    // Optimize bundle size
    if (!isServer) {
      // Keep chunks small for Cloudflare's file size limits
      config.optimization.splitChunks = {
        chunks: 'all',
        maxInitialRequests: 25,
        maxAsyncRequests: 25,
        minSize: 20000,
        maxSize: 20000000, // 20MB max chunk size
      };
    }
    
    // Don't include source maps in production
    if (!isServer) {
      config.devtool = false;
    }
    
    return config;
  },
  
  // Clean distDir before each build
  cleanDistDir: true,
};

export default nextConfig; 