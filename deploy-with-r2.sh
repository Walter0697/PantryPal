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

# 6. Deploy to Cloudflare Pages
echo "Deploying to Cloudflare Pages..."
if npx wrangler pages deployment create \
  --project-name=pantrypal \
  --branch=main \
  --r2-binding "DEPLOYMENT_ARTIFACT:${R2_BUCKET_NAME}:${ARTIFACT_PATH}" \
  --commit-message="Manual deployment via deploy-with-r2.sh script"; then
  
  echo "Deployment complete! Your site should be live soon."
else
  echo "Error: Deployment to Cloudflare Pages failed. See errors above."
  exit 1
fi 