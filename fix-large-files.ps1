# PowerShell script to fix "Pages only supports files up to 25 MiB in size" error
# This script specifically targets and removes the large webpack cache files

Write-Host "🔍 Searching for large files (>20MB)..." -ForegroundColor Cyan

# Convert MB to bytes for file size comparison
$twentyMB = 20 * 1024 * 1024  

# Remove webpack cache files (main culprit)
if (Test-Path "cache/webpack") {
    Write-Host "🧹 Removing webpack cache files in cache/webpack..." -ForegroundColor Yellow
    Get-ChildItem -Path "cache/webpack" -Recurse -Filter "*.pack" | ForEach-Object {
        Write-Host "Removing $($_.FullName)" -ForegroundColor Gray
        Remove-Item -Path $_.FullName -Force
    }
    
    Get-ChildItem -Path "cache/webpack" -Recurse -Filter "*.map" | ForEach-Object {
        Write-Host "Removing $($_.FullName)" -ForegroundColor Gray
        Remove-Item -Path $_.FullName -Force
    }
    
    # Specifically target the problematic file
    if (Test-Path "cache/webpack/client-production/0.pack") {
        Write-Host "🎯 Found the problematic file: cache/webpack/client-production/0.pack" -ForegroundColor Green
        Remove-Item -Path "cache/webpack/client-production/0.pack" -Force
        Write-Host "✅ Removed the file successfully." -ForegroundColor Green
    }
}

# Remove any .next cache files
if (Test-Path ".next/cache") {
    Write-Host "🧹 Removing .next/cache webpack files..." -ForegroundColor Yellow
    Get-ChildItem -Path ".next/cache" -Recurse -Filter "*.pack" | ForEach-Object {
        Write-Host "Removing $($_.FullName)" -ForegroundColor Gray
        Remove-Item -Path $_.FullName -Force
    }
    
    Get-ChildItem -Path ".next/cache" -Recurse -Filter "*.map" | ForEach-Object {
        Write-Host "Removing $($_.FullName)" -ForegroundColor Gray
        Remove-Item -Path $_.FullName -Force
    }
}

# Find any remaining large files
Write-Host "🔍 Checking for any remaining large files..." -ForegroundColor Cyan
$largeFiles = Get-ChildItem -Path "." -Recurse -File | Where-Object { 
    $_.Length -gt $twentyMB -and $_.FullName -notlike "*node_modules*" 
}

if (-not $largeFiles) {
    Write-Host "✅ Success! No large files found." -ForegroundColor Green
} else {
    Write-Host "⚠️ Found large files that still need to be addressed:" -ForegroundColor Yellow
    $largeFiles | ForEach-Object {
        Write-Host "$($_.FullName) - Size: $([Math]::Round($_.Length / 1MB, 2)) MB" -ForegroundColor Red
    }
    
    Write-Host ""
    $answer = Read-Host "Do you want to remove these files? (y/n)"
    if ($answer -eq "y") {
        Write-Host "🧹 Removing large files..." -ForegroundColor Yellow
        $largeFiles | ForEach-Object {
            Write-Host "Removing $($_.FullName)" -ForegroundColor Gray
            Remove-Item -Path $_.FullName -Force
        }
        Write-Host "✅ Files removed." -ForegroundColor Green
    } else {
        Write-Host "⚠️ Large files not removed. You may need to handle them manually." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "✅ Clean-up completed. You can now try to deploy again." -ForegroundColor Green 