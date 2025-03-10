#!/bin/bash
set -e

# Script to build, upload to R2, and deploy to Cloudflare Pages
echo "Starting static deployment process with R2 storage..."

# 1. Build the Next.js application as static export
echo "Building Next.js application in static export mode..."
export NEXT_PUBLIC_CLOUDFLARE_PAGES=true
export NODE_ENV=production
export NEXT_STATIC_EXPORT=true
npm run build

# 2. Prepare static build artifacts
echo "Preparing static build artifacts for R2 upload..."
if [ -d "out" ]; then
  # Create artifact archive
  tar -czf static-build.tar.gz -C out .
else
  echo "Error: 'out' directory not found. Static export build may have failed."
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
ARTIFACT_PATH="builds/stock-recorder-static-${TIMESTAMP}.tar.gz"

# Create verbose logs for debugging
echo "Running wrangler with debug output..."
export WRANGLER_LOG=debug

# Upload to R2 bucket using wrangler
if npx wrangler r2 object put ${R2_BUCKET_NAME}/${ARTIFACT_PATH} --file static-build.tar.gz; then
  echo "Static artifact successfully uploaded to R2: ${ARTIFACT_PATH}"
else
  echo "Error: Failed to upload static artifact to R2. See errors above."
  exit 1
fi

# 6. Extract R2 Artifact for Deployment
echo "Extracting R2 artifact for deployment..."

# Create a temporary directory for extraction
mkdir -p static-deployment

# Download the artifact from R2
if npx wrangler r2 object get ${R2_BUCKET_NAME}/${ARTIFACT_PATH} --file static-artifact.tar.gz; then
  echo "Static artifact downloaded from R2"
else
  echo "Error: Failed to download static artifact from R2. See errors above."
  exit 1
fi

# Extract the artifact
if tar -xzf static-artifact.tar.gz -C static-deployment; then
  echo "Static artifact extracted for deployment"
else
  echo "Error: Failed to extract static artifact. See errors above."
  exit 1
fi

# 7. Deploy to Cloudflare Pages
echo "Deploying to Cloudflare Pages..."
if npx wrangler pages deployment create ./static-deployment \
  --project-name=pantrypal \
  --branch=main \
  --commit-message="Static deployment via deploy-with-r2.sh script"; then
  
  echo "Static deployment complete! Your site should be live soon."
else
  echo "Error: Deployment to Cloudflare Pages failed. See errors above."
  exit 1
fi

# Clean up
echo "Cleaning up temporary files..."
rm -rf static-deployment static-artifact.tar.gz static-build.tar.gz 