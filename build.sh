#!/bin/bash
echo "Running custom build script for Cloudflare Pages deployment"

# Install dependencies with legacy-peer-deps flag
npm install --legacy-peer-deps

# Set environment variable to indicate we're on Cloudflare Pages
export NEXT_PUBLIC_CLOUDFLARE_PAGES=true

# Build with static export optimization
npm run build

# Check if output directory exists
if [ -d "out" ]; then
  echo "Static export detected in 'out' directory"
  
  # Create a .nojekyll file to prevent GitHub Pages from ignoring files starting with underscores
  touch out/.nojekyll
  
  # Add a simple _headers file for Cloudflare Pages to set cache headers
  cat > out/_headers << EOL
/*
  Cache-Control: public, max-age=0, must-revalidate

/assets/*
  Cache-Control: public, max-age=31536000, immutable
EOL

  echo "Build preparation complete"
else
  echo "Warning: 'out' directory not found. Build may have failed."
  exit 1
fi 