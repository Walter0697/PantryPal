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
mkdir -p $VERCEL_OUTPUT_DIR

# Step 3: Copy files to Vercel output structure
echo "📋 Step 3: Copying files to Vercel output structure..."

# Copy static files (excluding large webpack cache files)
if [ -d ".next/static" ]; then
  echo "Copying .next/static files (excluding *.pack and *.map)..."
  mkdir -p "$VERCEL_OUTPUT_DIR/_next/static"
  
  # Use find to copy only specific file types, excluding large files
  find .next/static -type f -not -name "*.pack" -not -name "*.map" -exec cp {} "$VERCEL_OUTPUT_DIR/_next/static/" \;
  
  # Create directory structure with empty files to maintain paths
  find .next/static -type d | while read dir; do
    mkdir -p "$VERCEL_OUTPUT_DIR/$dir"
  done
fi

# Copy public files if they exist
if [ -d "public" ]; then
  echo "Copying public files..."
  cp -R public/* $VERCEL_OUTPUT_DIR/
fi

# Step 4: Create improved _worker.js file
echo "🔧 Step 4: Creating Cloudflare worker script..."
cat > "$VERCEL_OUTPUT_DIR/_worker.js" << 'EOL'
// Cloudflare Pages Worker - Simplified for compatibility
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Directly serve static assets
    if (path.startsWith('/_next/') || 
        path.match(/\.(ico|svg|png|jpg|jpeg|css|js)$/)) {
      return fetch(request);
    }
    
    // For all routes, try to serve index.html
    try {
      return fetch(new URL('/index.html', request.url));
    } catch (e) {
      return new Response('Page not found', { status: 404 });
    }
  }
};
EOL

# Step 5: Create a basic HTML entry point
echo "📄 Step 5: Creating basic HTML entry point..."
cat > "$VERCEL_OUTPUT_DIR/index.html" << 'EOL'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Stock Recorder</title>
  <link rel="stylesheet" href="/_next/static/css/app.css">
</head>
<body>
  <div id="__next"></div>
  <script src="/_next/static/chunks/main.js" defer></script>
  <script src="/_next/static/chunks/pages/index.js" defer></script>
</body>
</html>
EOL

# Step 6: Create a simple _routes.json file for Cloudflare Pages
echo "📝 Step 6: Creating Cloudflare Pages routes config..."
cat > "$VERCEL_OUTPUT_DIR/_routes.json" << 'EOL'
{
  "version": 1,
  "include": ["/*"],
  "exclude": []
}
EOL

# Step 7: Generate a minimal bundle by excluding large files
echo "📦 Step 7: Creating optimized build for Cloudflare..."

# Create a list of files over 20MB to exclude
echo "🔍 Checking for files over 20MB..."
find $VERCEL_OUTPUT_DIR -type f -size +20M | while read file; do
  echo "⚠️ Excluding large file: $file"
  rm "$file"
done

# Step 8: Create archive for R2
echo "📦 Step 8: Creating archive for R2 upload..."
tar -czf pages-build.tar.gz -C $VERCEL_OUTPUT_DIR .

echo "✅ Build complete! You can now upload the pages-build.tar.gz file to R2." 