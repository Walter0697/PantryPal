#!/bin/bash
set -e

# Script to build with custom build script, upload to R2, and deploy to Cloudflare Pages
echo "Starting Cloudflare Pages deployment process with R2 storage..."

# 1. Build using the custom build script
echo "Building using custom build script..."
chmod +x ./build-pages.sh
./build-pages.sh

# 2. Check for required environment variables
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

# 3. Install and verify wrangler
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

# 4. Upload to R2
echo "Uploading to Cloudflare R2..."
TIMESTAMP=$(date +%Y%m%d%H%M%S)
ARTIFACT_PATH="builds/stock-recorder-pages-${TIMESTAMP}.tar.gz"

# Create verbose logs for debugging
echo "Running wrangler with debug output..."
export WRANGLER_LOG=debug

# Upload to R2 bucket using wrangler
if npx wrangler r2 object put ${R2_BUCKET_NAME}/${ARTIFACT_PATH} --file pages-build.tar.gz; then
  echo "Pages artifact successfully uploaded to R2: ${ARTIFACT_PATH}"
else
  echo "Error: Failed to upload pages artifact to R2. See errors above."
  exit 1
fi

# 5. Extract R2 Artifact for Deployment
echo "Extracting R2 artifact for deployment..."

# Create a temporary directory for extraction
mkdir -p pages-deployment

# Download the artifact from R2
if npx wrangler r2 object get ${R2_BUCKET_NAME}/${ARTIFACT_PATH} --file pages-artifact.tar.gz; then
  echo "Pages artifact downloaded from R2"
else
  echo "Error: Failed to download pages artifact from R2. See errors above."
  exit 1
fi

# Extract the artifact
if tar -xzf pages-artifact.tar.gz -C pages-deployment; then
  echo "Pages artifact extracted for deployment"
else
  echo "Error: Failed to extract pages artifact. See errors above."
  exit 1
fi

# 6. Deploy to Cloudflare Pages
echo "Deploying to Cloudflare Pages..."
if npx wrangler pages deploy ./pages-deployment \
  --project-name=pantrypal \
  --branch=main \
  --commit-message="Deployment via deploy-with-r2.sh script"; then
  
  echo "Pages deployment complete! Your site should be live soon."
else
  echo "Error: Deployment to Cloudflare Pages failed. See errors above."
  exit 1
fi

# Clean up
echo "Cleaning up temporary files..."
rm -rf pages-deployment pages-artifact.tar.gz 