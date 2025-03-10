#!/bin/bash
echo "Running custom build script for Cloudflare Pages deployment"

# Install dependencies with legacy-peer-deps flag
npm install --legacy-peer-deps

# Set environment variable to indicate we're on Cloudflare Pages
export NEXT_PUBLIC_CLOUDFLARE_PAGES=true

# Build with production optimization 
npm run build

# If standalone output was generated
if [ -d ".next/standalone" ]; then
  echo "Standalone build detected, preparing for Cloudflare Pages"
  
  # Copy public and static files to standalone directory
  if [ -d ".next/static" ]; then
    mkdir -p .next/standalone/.next/static
    cp -R .next/static .next/standalone/.next/
  fi
  
  # Remove any large files that might exceed Cloudflare's limits
  find .next/standalone -name "*.pack" -delete
  find .next/standalone -name "*.map" -delete
  
  echo "Build preparation complete"
else
  echo "Warning: Standalone build directory not found"
fi 