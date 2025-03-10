#!/bin/bash
set -e

# Script to build server-side rendered Next.js, upload to R2, and deploy to Cloudflare Pages
echo "Starting server-side deployment process with R2 storage..."

# 1. Build the Next.js application with server-side rendering
echo "Building Next.js application in server-side rendering mode..."
export NEXT_PUBLIC_CLOUDFLARE_PAGES=true
export NODE_ENV=production
npm run build

# 2. Create Edge Worker to handle request forwarding
echo "Creating Edge Worker for Cloudflare Pages..."
cat > _worker.js << 'EOF'
// Cloudflare Pages Edge Worker for Next.js standalone server
export default {
  async fetch(request, env) {
    // The URL pathname
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // Serve static assets directly
    if (pathname.startsWith('/_next/static/') || 
        pathname.startsWith('/images/') || 
        pathname.endsWith('.ico') || 
        pathname.endsWith('.svg') ||
        pathname.endsWith('.png') || 
        pathname.endsWith('.jpg') || 
        pathname.endsWith('.jpeg') ||
        pathname.endsWith('.css') || 
        pathname.endsWith('.js')) {
      // Pass through to Cloudflare's asset serving
      return fetch(request);
    }
    
    // For API requests and dynamic pages, proxy to the Next.js server
    try {
      // Create a fully qualified URL to forward to server.js
      // In Cloudflare, we invoke the server through the binding
      return await env.NEXT_SERVER.fetch(request);
    } catch (error) {
      return new Response(`Server Error: ${error.message}`, {
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  }
};
EOF

# 3. Prepare build artifacts
echo "Preparing server-side build artifacts for R2 upload..."
if [ -d ".next/standalone" ]; then
  # Copy static and public assets to standalone directory
  if [ -d ".next/static" ]; then
    mkdir -p .next/standalone/.next/static
    cp -R .next/static .next/standalone/.next/
  fi
  
  if [ -d "public" ]; then
    cp -R public .next/standalone/
  fi
  
  # Remove any large files that might exceed Cloudflare's limits
  find .next/standalone -name "*.pack" -delete
  find .next/standalone -name "*.map" -delete
  
  # Copy the edge worker file
  cp _worker.js .next/standalone/
  
  # Create artifact archive
  tar -czf server-build.tar.gz -C .next/standalone .
else
  echo "Error: Standalone directory not found. Build may have failed."
  exit 1
fi

# 4. Check for required environment variables
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  echo "Error: CLOUDFLARE_API_TOKEN environment variable not set."
  echo "Please set it with: export CLOUDFLARE_API_TOKEN=your_token"
  exit 1
fi

if [ -z "$CLOUDFLARE_ACCOUNT_ID" ]; then
  echo "Error: CLOUDFLARE_ACCOUNT_ID environment variable not set."
  echo "Please set it with: export CLOUDFLARE_ACCOUNT_ID=your_account_id"
  exit 1
fi

if [ -z "$R2_BUCKET_NAME" ]; then
  echo "Error: R2_BUCKET_NAME environment variable not set."
  echo "Please set it with: export R2_BUCKET_NAME=your_bucket_name"
  exit 1
fi

# 5. Install and verify wrangler
echo "Setting up wrangler..."
if ! command -v wrangler &> /dev/null; then
  echo "Wrangler not found. Installing wrangler globally..."
  npm install -g wrangler
fi

# Verify wrangler is working
echo "Verifying wrangler installation and authentication..."
if ! wrangler whoami; then
  echo "Error: Wrangler authentication failed. Please check your CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID."
  exit 1
fi

# 6. Upload to R2
echo "Uploading to Cloudflare R2..."
TIMESTAMP=$(date +%Y%m%d%H%M%S)
ARTIFACT_PATH="builds/stock-recorder-server-${TIMESTAMP}.tar.gz"

# Create verbose logs for debugging
echo "Running wrangler with debug output..."
export WRANGLER_LOG=debug

# Upload to R2 bucket using wrangler
if npx wrangler r2 object put ${R2_BUCKET_NAME}/${ARTIFACT_PATH} --file server-build.tar.gz; then
  echo "Server artifact successfully uploaded to R2: ${ARTIFACT_PATH}"
else
  echo "Error: Failed to upload server artifact to R2. See errors above."
  exit 1
fi

# 7. Extract R2 Artifact for Deployment
echo "Extracting R2 artifact for deployment..."

# Create a temporary directory for extraction
mkdir -p server-deployment

# Download the artifact from R2
if npx wrangler r2 object get ${R2_BUCKET_NAME}/${ARTIFACT_PATH} --file server-artifact.tar.gz; then
  echo "Server artifact downloaded from R2"
else
  echo "Error: Failed to download server artifact from R2. See errors above."
  exit 1
fi

# Extract the artifact
if tar -xzf server-artifact.tar.gz -C server-deployment; then
  echo "Server artifact extracted for deployment"
else
  echo "Error: Failed to extract server artifact. See errors above."
  exit 1
fi

# 8. Deploy to Cloudflare Pages with Server Binding
echo "Deploying to Cloudflare Pages..."
if npx wrangler pages deploy ./server-deployment \
  --project-name=pantrypal \
  --branch=main \
  --commit-message="Server-side deployment via deploy-with-r2.sh script" \
  --binding "NEXT_SERVER:workerd" \
  --compatibility-date=$(date +%Y-%m-%d); then
  
  echo "Server-side deployment complete! Your site should be live soon."
else
  echo "Error: Deployment to Cloudflare Pages failed. See errors above."
  exit 1
fi

# Clean up
echo "Cleaning up temporary files..."
rm -rf server-deployment server-artifact.tar.gz server-build.tar.gz _worker.js 