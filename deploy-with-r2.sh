#!/bin/bash
set -e

# Check if environment variables are set
if [ -z "$CLOUDFLARE_API_TOKEN" ] || [ -z "$CLOUDFLARE_ACCOUNT_ID" ] || [ -z "$R2_BUCKET_NAME" ]; then
  echo "Error: Required environment variables are not set."
  echo "Please set: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, and R2_BUCKET_NAME"
  exit 1
fi

echo "🚀 Starting deployment process to Cloudflare Pages..."

# Clean up any previous builds or cache
echo "🧹 Cleaning previous builds and cache..."
rm -rf .next/cache
rm -rf cache
rm -rf pages-build.tar.gz

# Build the application
echo "🔨 Building application..."
./build-pages.sh

# Check for any large files that might have been missed
echo "🔍 Final check for large files (>20MB)..."
LARGE_FILES=$(find .vercel/output/static -type f -size +20M)
if [ ! -z "$LARGE_FILES" ]; then
  echo "⚠️ Found large files that will be excluded:"
  echo "$LARGE_FILES"
  echo "Removing large files..."
  find .vercel/output/static -type f -size +20M -delete
fi

# Upload to R2 bucket
echo "☁️ Uploading build archive to R2 bucket..."
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/r2/buckets/$R2_BUCKET_NAME/objects/pages-build.tar.gz" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/gzip" \
  --data-binary @pages-build.tar.gz

# Get direct upload URL
echo "🌐 Creating Cloudflare Pages deployment..."
DEPLOY_RESPONSE=$(curl -X POST "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/stock-recorder/deployments" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data "{\"production\": {\"r2_bucket\": \"$R2_BUCKET_NAME\", \"r2_object\": \"pages-build.tar.gz\"}}")

# Extract deployment URL
DEPLOY_URL=$(echo $DEPLOY_RESPONSE | grep -o '"url":"[^"]*"' | cut -d'"' -f4)

# If jq is available, use it for better parsing
if command -v jq &> /dev/null; then
  DEPLOY_URL=$(echo $DEPLOY_RESPONSE | jq -r '.result.url')
  DEPLOY_ID=$(echo $DEPLOY_RESPONSE | jq -r '.result.id')
  echo "Deployment URL: $DEPLOY_URL"
  echo "Deployment ID: $DEPLOY_ID"
else
  echo "Deployment initiated. Response:"
  echo "$DEPLOY_RESPONSE"
fi

# Wait for deployment to complete
echo "⏳ Waiting for deployment to complete..."
sleep 10

# Set worker permissions
echo "🔒 Setting worker permissions..."
WORKER_CONFIG_RESPONSE=$(curl -X PATCH "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/stock-recorder/deployments/latest" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"deployment_configs":{"production":{"compatibility_flags":["streams_enable_constructors"],"compatibility_date":"2023-10-30","usage_model":"bundled"}}}')

# Clean up temporary files
echo "🧹 Cleaning up temporary build files..."
rm -rf .next/cache
rm -rf cache

echo "✅ Deployment complete! Your site should be available at: $DEPLOY_URL" 