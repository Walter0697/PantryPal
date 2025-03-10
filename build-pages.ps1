# PowerShell script to build Next.js app for Cloudflare Pages on Windows
Write-Host "📦 Building Next.js app for Cloudflare Pages..." -ForegroundColor Cyan

# Set environment variables
$env:NODE_ENV = "production"
$env:NEXT_PUBLIC_CLOUDFLARE_PAGES = "true"

# Step 1: Build Next.js app
Write-Host "🔨 Step 1: Building Next.js application..." -ForegroundColor Yellow
npm run build

if (-not $?) {
    Write-Host "❌ Next.js build failed! Exiting." -ForegroundColor Red
    exit 1
}

# Step 2: Create output directories
Write-Host "📂 Step 2: Setting up output directories..." -ForegroundColor Yellow
$vercelOutputDir = ".vercel/output/static"

if (-not (Test-Path $vercelOutputDir)) {
    New-Item -ItemType Directory -Path $vercelOutputDir -Force | Out-Null
}

# Step 3: Copy files to Vercel output structure
Write-Host "📋 Step 3: Copying files to Vercel output structure..." -ForegroundColor Yellow

# Copy all static files
if (Test-Path ".next/static") {
    if (-not (Test-Path "$vercelOutputDir/_next/static")) {
        New-Item -ItemType Directory -Path "$vercelOutputDir/_next/static" -Force | Out-Null
    }
    Copy-Item -Path ".next/static/*" -Destination "$vercelOutputDir/_next/static" -Recurse -Force
}

# Copy public files if they exist
if (Test-Path "public") {
    Copy-Item -Path "public/*" -Destination $vercelOutputDir -Recurse -Force
}

# Step 4: Create minimal _worker.js file
Write-Host "🔧 Step 4: Creating Cloudflare worker script..." -ForegroundColor Yellow

$workerJs = @"
// Cloudflare Pages Edge Worker
export default {
  async fetch(request, env, ctx) {
    // Parse the URL
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // Handle static assets
    if (pathname.startsWith('/_next/static/') || 
        pathname.startsWith('/images/') || 
        pathname.endsWith('.ico') || 
        pathname.endsWith('.svg') ||
        pathname.endsWith('.png') || 
        pathname.endsWith('.jpg') || 
        pathname.endsWith('.jpeg') ||
        pathname.endsWith('.css') || 
        pathname.endsWith('.js')) {
      return fetch(request);
    }
    
    // For all other routes, serve the index.html
    try {
      const response = await fetch(new URL('/index.html', request.url));
      return new Response(response.body, {
        headers: {
          'content-type': 'text/html;charset=UTF-8',
        },
      });
    } catch (error) {
      return new Response(`Server Error: ${error.message}`, {
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  }
};
"@

Set-Content -Path "$vercelOutputDir/_worker.js" -Value $workerJs

# Step 5: Create a basic static HTML page
Write-Host "📄 Step 5: Creating basic static HTML page..." -ForegroundColor Yellow

$indexHtml = @"
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Stock Recorder</title>
  <script src="/_next/static/chunks/pages/index.js" defer></script>
  <link rel="stylesheet" href="/_next/static/css/app.css">
</head>
<body>
  <div id="__next"></div>
  <script>
    // This is a basic client-side router that will load the correct script
    const path = window.location.pathname;
    const script = document.createElement('script');
    script.src = `/_next/static/chunks/pages${path === '/' ? '/index' : path}.js`;
    script.defer = true;
    document.head.appendChild(script);
  </script>
</body>
</html>
"@

Set-Content -Path "$vercelOutputDir/index.html" -Value $indexHtml

# Step 6: Create archive for R2
Write-Host "📦 Step 6: Creating archive for R2 upload..." -ForegroundColor Yellow
Compress-Archive -Path "$vercelOutputDir/*" -DestinationPath "pages-build.zip" -Force

Write-Host "✅ Build complete! You can now upload the pages-build.zip file to R2." -ForegroundColor Green 