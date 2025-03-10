#!/bin/bash
# Script to fix "Pages only supports files up to 25 MiB in size" error
# This script specifically targets and removes the large webpack cache files

echo "🔍 Searching for large files (>20MB)..."

# Remove webpack cache files (main culprit)
if [ -d "cache/webpack" ]; then
  echo "🧹 Removing webpack cache files in cache/webpack..."
  find cache/webpack -name "*.pack" -delete
  find cache/webpack -name "*.map" -delete
  
  # Specifically target the problematic file
  if [ -f "cache/webpack/client-production/0.pack" ]; then
    echo "🎯 Found the problematic file: cache/webpack/client-production/0.pack"
    rm -f cache/webpack/client-production/0.pack
    echo "✅ Removed the file successfully."
  fi
fi

# Remove any .next cache files
if [ -d ".next/cache" ]; then
  echo "🧹 Removing .next/cache webpack files..."
  find .next/cache -name "*.pack" -delete
  find .next/cache -name "*.map" -delete
fi

# Find any remaining large files
echo "🔍 Checking for any remaining large files..."
LARGE_FILES=$(find . -type f -size +20M -not -path "./node_modules/*")

if [ -z "$LARGE_FILES" ]; then
  echo "✅ Success! No large files found."
else
  echo "⚠️ Found large files that still need to be addressed:"
  echo "$LARGE_FILES"
  echo ""
  echo "Do you want to remove these files? (y/n)"
  read answer
  if [ "$answer" = "y" ]; then
    echo "🧹 Removing large files..."
    echo "$LARGE_FILES" | xargs rm -f
    echo "✅ Files removed."
  else
    echo "⚠️ Large files not removed. You may need to handle them manually."
  fi
fi

echo ""
echo "✅ Clean-up completed. You can now try to deploy again." 