#!/bin/bash
set -e

# Check if environment variables are set
if [ -z "$CLOUDFLARE_API_TOKEN" ] || [ -z "$CLOUDFLARE_ACCOUNT_ID" ] || [ -z "$R2_BUCKET_NAME" ]; then
  echo "Error: Required environment variables are not set."
  echo "Please set: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, and R2_BUCKET_NAME"
  exit 1
fi

echo "🚀 Starting deployment process to Cloudflare Pages..."

# Build the application
./build-pages.sh

# Upload to R2 bucket
echo "☁️ Uploading build archive to R2 bucket..."
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/r2/buckets/$R2_BUCKET_NAME/objects/pages-build.tar.gz" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/gzip" \
  --data-binary @pages-build.tar.gz

# Get direct upload URL
DEPLOY_URL=$(curl -X POST "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/stock-recorder/deployments" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data "{\"production\": {\"r2_bucket\": \"$R2_BUCKET_NAME\", \"r2_object\": \"pages-build.tar.gz\"}}" | jq -r '.result.url')

# Wait for deployment to complete
echo "⏳ Waiting for deployment to complete..."
sleep 10

# Set worker permissions
echo "🔒 Setting worker permissions..."
curl -X PATCH "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/stock-recorder/deployments/latest" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"deployment_configs":{"production":{"compatibility_flags":["streams_enable_constructors"],"compatibility_date":"2023-10-30","usage_model":"bundled"}}}'

echo "✅ Deployment complete! Your site should be available at: $DEPLOY_URL" 