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

# Step 4: Create improved _worker.js file
Write-Host "🔧 Step 4: Creating Cloudflare worker script..." -ForegroundColor Yellow

$workerJs = @"
// Cloudflare Pages Worker - Simplified for compatibility
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Directly serve static assets
    if (path.startsWith('/_next/') || 
        path.match(/\.(ico|svg|png|jpg|jpeg|css|js)$/)) {
      return fetch(request);
    }
    
    // For all routes, try to serve index.html
    try {
      return fetch(new URL('/index.html', request.url));
    } catch (e) {
      return new Response('Page not found', { status: 404 });
    }
  }
};
"@

Set-Content -Path "$vercelOutputDir/_worker.js" -Value $workerJs

# Step 5: Create a basic HTML entry point
Write-Host "📄 Step 5: Creating basic HTML entry point..." -ForegroundColor Yellow

$indexHtml = @"
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Stock Recorder</title>
  <link rel="stylesheet" href="/_next/static/css/app.css">
</head>
<body>
  <div id="__next"></div>
  <script src="/_next/static/chunks/main.js" defer></script>
  <script src="/_next/static/chunks/pages/index.js" defer></script>
</body>
</html>
"@

Set-Content -Path "$vercelOutputDir/index.html" -Value $indexHtml

# Step 6: Create a simple _routes.json file for Cloudflare Pages
Write-Host "📝 Step 6: Creating Cloudflare Pages routes config..." -ForegroundColor Yellow

$routesJson = @"
{
  "version": 1,
  "include": ["/*"],
  "exclude": []
}
"@

Set-Content -Path "$vercelOutputDir/_routes.json" -Value $routesJson

# Step 7: Create archive for R2
Write-Host "📦 Step 7: Creating archive for R2 upload..." -ForegroundColor Yellow
Compress-Archive -Path "$vercelOutputDir/*" -DestinationPath "pages-build.zip" -Force

Write-Host "✅ Build complete! You can now upload the pages-build.zip file to R2." -ForegroundColor Green 