#!/bin/bash
echo "Running custom build script for Cloudflare Pages deployment"

# Install dependencies with legacy-peer-deps flag
npm install --legacy-peer-deps

# Set environment variable to indicate we're on Cloudflare Pages
export NEXT_PUBLIC_CLOUDFLARE_PAGES=true
export NODE_ENV=production

# Build with standalone optimization
npm run build

# Check if standalone output directory exists
if [ -d ".next/standalone" ]; then
  echo "Standalone build detected, preparing for Cloudflare Pages"
  
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
  
  # Create a minimal server.js file for Cloudflare Pages
  cat > .next/standalone/server.js << EOL
// This is a minimal server for Cloudflare Pages
// It forwards requests to the Next.js server
const { Server } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 8788; // Default Cloudflare Pages port
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = new Server(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });
  
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(\`> Ready on http://\${hostname}:\${port}\`);
  });
});
EOL
  
  echo "Build preparation complete"
else
  echo "Warning: Standalone directory not found. Build may have failed."
  exit 1
fi 