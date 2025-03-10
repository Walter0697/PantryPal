#!/bin/bash
set -e

# Bash script to build Next.js app for Cloudflare Pages
echo "📦 Building Next.js app for Cloudflare Pages..."

# Set environment variables
export NODE_ENV=production
export NEXT_PUBLIC_CLOUDFLARE_PAGES=true

# Step 1: Build Next.js app
echo "🔨 Step 1: Building Next.js application..."
npm run build

# Step 2: Create output directories
echo "📂 Step 2: Setting up output directories..."
VERCEL_OUTPUT_DIR=".vercel/output/static"

mkdir -p "$VERCEL_OUTPUT_DIR"

# Step 3: Copy files to Vercel output structure
echo "📋 Step 3: Copying files to Vercel output structure..."

# Copy all static files
if [ -d ".next/static" ]; then
  mkdir -p "$VERCEL_OUTPUT_DIR/_next/static"
  cp -R .next/static/* "$VERCEL_OUTPUT_DIR/_next/static/"
fi

# Copy public files if they exist
if [ -d "public" ]; then
  cp -R public/* "$VERCEL_OUTPUT_DIR/"
fi

# Step 4: Create minimal _worker.js file
echo "🔧 Step 4: Creating Cloudflare worker script..."

cat > "$VERCEL_OUTPUT_DIR/_worker.js" << 'EOF'
// Cloudflare Pages Edge Worker
export default {
  async fetch(request, env, ctx) {
    // Parse the URL
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // Handle static assets
    if (pathname.startsWith('/_next/static/') || 
        pathname.startsWith('/images/') || 
        pathname.endsWith('.ico') || 
        pathname.endsWith('.svg') ||
        pathname.endsWith('.png') || 
        pathname.endsWith('.jpg') || 
        pathname.endsWith('.jpeg') ||
        pathname.endsWith('.css') || 
        pathname.endsWith('.js')) {
      return fetch(request);
    }
    
    // For all other routes, serve the index.html
    try {
      const response = await fetch(new URL('/index.html', request.url));
      return new Response(response.body, {
        headers: {
          'content-type': 'text/html;charset=UTF-8',
        },
      });
    } catch (error) {
      return new Response(`Server Error: ${error.message}`, {
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  }
};
EOF

# Step 5: Create a basic static HTML page
echo "📄 Step 5: Creating basic static HTML page..."

cat > "$VERCEL_OUTPUT_DIR/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Stock Recorder</title>
  <script src="/_next/static/chunks/pages/index.js" defer></script>
  <link rel="stylesheet" href="/_next/static/css/app.css">
</head>
<body>
  <div id="__next"></div>
  <script>
    // This is a basic client-side router that will load the correct script
    const path = window.location.pathname;
    const script = document.createElement('script');
    script.src = `/_next/static/chunks/pages${path === '/' ? '/index' : path}.js`;
    script.defer = true;
    document.head.appendChild(script);
  </script>
</body>
</html>
EOF

# Step 6: Create archive for R2
echo "📦 Step 6: Creating archive for R2 upload..."
tar -czf pages-build.tar.gz -C "$VERCEL_OUTPUT_DIR" .

echo "✅ Build complete! You can now upload the pages-build.tar.gz file to R2." 