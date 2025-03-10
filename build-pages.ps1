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

# Copy static files (excluding large webpack cache files)
if (Test-Path ".next/static") {
    Write-Host "Copying .next/static files (excluding *.pack and *.map)..." -ForegroundColor Yellow
    if (-not (Test-Path "$vercelOutputDir/_next/static")) {
        New-Item -ItemType Directory -Path "$vercelOutputDir/_next/static" -Force | Out-Null
    }
    
    # Get all subdirectories from .next/static and create them in the destination
    Get-ChildItem -Path ".next/static" -Directory -Recurse | ForEach-Object {
        $relativePath = $_.FullName.Substring((Get-Item ".next/static").FullName.Length)
        $targetPath = Join-Path "$vercelOutputDir/_next/static" $relativePath
        if (-not (Test-Path $targetPath)) {
            New-Item -ItemType Directory -Path $targetPath -Force | Out-Null
        }
    }
    
    # Copy all files except *.pack and *.map
    Get-ChildItem -Path ".next/static" -File -Recurse | Where-Object { $_.Extension -ne ".pack" -and $_.Extension -ne ".map" } | ForEach-Object {
        $relativePath = $_.FullName.Substring((Get-Item ".next/static").FullName.Length)
        $targetPath = Join-Path "$vercelOutputDir/_next/static" $relativePath
        Copy-Item -Path $_.FullName -Destination $targetPath -Force
    }
}

# Copy public files if they exist
if (Test-Path "public") {
    Write-Host "Copying public files..." -ForegroundColor Yellow
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

# Step 7: Generate a minimal bundle by excluding large files
Write-Host "📦 Step 7: Creating optimized build for Cloudflare..." -ForegroundColor Yellow

# Find and remove any files over 20MB
Write-Host "🔍 Checking for files over 20MB..." -ForegroundColor Yellow
Get-ChildItem -Path $vercelOutputDir -File -Recurse | Where-Object { $_.Length -gt 20MB } | ForEach-Object {
    Write-Host "⚠️ Excluding large file: $($_.FullName)" -ForegroundColor Red
    Remove-Item -Path $_.FullName -Force
}

# Step 8: Create archive for R2
Write-Host "📦 Step 8: Creating archive for R2 upload..." -ForegroundColor Yellow
Compress-Archive -Path "$vercelOutputDir/*" -DestinationPath "pages-build.zip" -Force

Write-Host "✅ Build complete! You can now upload the pages-build.zip file to R2." -ForegroundColor Green 