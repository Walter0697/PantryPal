#!/bin/bash
set -e

# Script to build, upload to R2, and deploy to Cloudflare Pages
echo "Starting deployment process with R2 storage..."

# 1. Build the Next.js application
echo "Building Next.js application..."
export NEXT_PUBLIC_CLOUDFLARE_PAGES=true
export NODE_ENV=production
npm run build

# 2. Prepare build artifacts
echo "Preparing build artifacts for R2 upload..."
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
  
  # Create or copy the Cloudflare worker script
  if [ -f "_worker.js" ]; then
    cp _worker.js .next/standalone/
  else
    # Create a basic _worker.js if it doesn't exist
    cat > .next/standalone/_worker.js << 'EOL'
// Cloudflare Pages Worker for Next.js
export default {
  async fetch(request, env) {
    try {
      // Forward the request to the Next.js server
      const nextServer = await import('./server.js');
      
      // Create a simulated request event for the Next.js server
      return await nextServer.default.fetch(request, env);
    } catch (error) {
      return new Response(`Server Error: ${error.message}`, {
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  }
};
EOL
  fi
  
  # Ensure we have a proper server.js file
  if [ ! -f ".next/standalone/server.js" ]; then
    echo "Warning: server.js not found in standalone output. Creating a basic one."
    # Create a basic server.js file that exports a fetch handler
    cat > .next/standalone/server.js << 'EOL'
import { createServer } from 'node:http';
import { Server } from 'next/dist/server/next-server.js';

// Create a fetch handler for the Next.js app
const nextServer = new Server({
  hostname: 'localhost',
  port: Number(process.env.PORT) || 8788,
  dir: '.',
  dev: false,
  customServer: false,
  conf: {
  distDir: '.next',
  output: 'standalone',
  },
});

const handler = nextServer.getRequestHandler();

// Create a fetch function for the worker
export default {
  fetch: async (request, env) => {
    // Parse the URL
    const url = new URL(request.url);
    
    // Handle the request
    return await handler(request, url);
  }
};

// For local testing, also export a standard Node.js server
if (typeof process !== 'undefined') {
  const port = Number(process.env.PORT) || 8788;
  createServer((req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    handler(req, res, url);
  }).listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
}
EOL
  fi
  
  # Create artifact archive
  tar -czf build-artifact.tar.gz -C .next/standalone .
else
  echo "Error: Standalone directory not found. Build may have failed."
  exit 1
fi

# 3. Check for required environment variables
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

# 4. Install and verify wrangler
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

# 5. Upload to R2
echo "Uploading to Cloudflare R2..."
TIMESTAMP=$(date +%Y%m%d%H%M%S)
ARTIFACT_PATH="builds/stock-recorder-${TIMESTAMP}.tar.gz"

# Create verbose logs for debugging
echo "Running wrangler with debug output..."
export WRANGLER_LOG=debug

# Upload to R2 bucket using wrangler
if npx wrangler r2 object put ${R2_BUCKET_NAME}/${ARTIFACT_PATH} --file build-artifact.tar.gz; then
  echo "Artifact successfully uploaded to R2: ${ARTIFACT_PATH}"
else
  echo "Error: Failed to upload artifact to R2. See errors above."
  exit 1
fi

# 6. Extract R2 Artifact for Deployment
echo "Extracting R2 artifact for deployment..."

# Create a temporary directory for extraction
mkdir -p r2-deployment

# Download the artifact from R2
if npx wrangler r2 object get ${R2_BUCKET_NAME}/${ARTIFACT_PATH} --file r2-artifact.tar.gz; then
  echo "Artifact downloaded from R2"
else
  echo "Error: Failed to download artifact from R2. See errors above."
  exit 1
fi

# Extract the artifact
if tar -xzf r2-artifact.tar.gz -C r2-deployment; then
  echo "Artifact extracted for deployment"
else
  echo "Error: Failed to extract artifact. See errors above."
  exit 1
fi

# Verify _worker.js exists
if [ ! -f "r2-deployment/_worker.js" ]; then
  echo "Warning: _worker.js not found in extracted files. This may cause 404 errors."
fi

# 7. Deploy to Cloudflare Pages
echo "Deploying to Cloudflare Pages..."
if npx wrangler pages deployment create ./r2-deployment \
  --project-name=pantrypal \
  --branch=main \
  --commit-message="Manual deployment via deploy-with-r2.sh script"; then
  
  echo "Deployment complete! Your site should be live soon."
else
  echo "Error: Deployment to Cloudflare Pages failed. See errors above."
  exit 1
fi

# Clean up
echo "Cleaning up temporary files..."
rm -rf r2-deployment r2-artifact.tar.gz 