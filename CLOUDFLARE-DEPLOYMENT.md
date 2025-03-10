# Deploying to Cloudflare Pages with R2 Storage

This document outlines the process for deploying the Next.js application to Cloudflare Pages using R2 Storage for artifact storage.

## Why Use R2 Storage?

We use Cloudflare R2 Storage for artifact storage to overcome size limitations of direct deployments through Cloudflare Pages, especially when using server-side rendering or API routes. This approach gives us more control over the deployment process.

## Important: Wrangler Configuration

Cloudflare Pages requires a valid `wrangler.toml` file with the `pages_build_output_dir` property set correctly. Our deployment scripts automatically create or update this file, but if you see this error:

```
A wrangler.toml file was found but it does not appear to be valid.
```

Make sure the file contains:
```toml
# Cloudflare Pages configuration
name = "pantrypal"  # Match your Cloudflare project name

# Set the build output directory for Pages (this is critical)
pages_build_output_dir = ".vercel/output/static"
```

## Important: Build Output Directory Configuration

In your Cloudflare Pages project settings, make sure you set:

**Build output directory:** `/.vercel/output/static`

This tells Cloudflare where to find your site content within the uploaded archive. Our build scripts are configured to create this exact directory structure.

If you see the error "Output directory '.vercel/output/static' not found", it means Cloudflare can't find this directory in your deployment artifact. Our updated build scripts (as of the latest version) are designed to preserve this directory structure during the upload process.

## Important: Configuring Project Name

The deployment scripts require the correct Cloudflare Pages project name, which may not match your repository name. By default, the scripts use `pantrypal` as the project name.

To specify your Cloudflare Pages project name:

```bash
# Set the project name environment variable
export CLOUDFLARE_PAGES_PROJECT="your-actual-project-name"
```

For GitHub Actions, add a secret named `CLOUDFLARE_PAGES_PROJECT` with your project name.

To find your Cloudflare Pages project name:
1. Go to the Cloudflare Dashboard
2. Navigate to Pages
3. Find your project and note the exact name (it's case-sensitive)

## File Size Limitations

Cloudflare Pages has a strict file size limit of 25 MiB per file. Next.js builds can generate large files, especially webpack cache files (*.pack, *.map) that often exceed this limit. Our custom build scripts handle this by:

1. Excluding large webpack cache files (*.pack, *.map)
2. Removing any file larger than 20MB from the final build
3. Creating a minimal bundle that stays within Cloudflare's limits

This approach ensures our deployments won't fail due to the "Pages only supports files up to 25 MiB in size" error.

### Quick Fix for File Size Issues

If you encounter the "Pages only supports files up to 25 MiB in size" error during deployment, use one of these scripts to quickly fix the issue:

#### For macOS/Linux Users:
```bash
# Run the fix script
./fix-large-files.sh
```

#### For Windows Users:
```powershell
# Run the fix script
./fix-large-files.ps1
```

These scripts will:
1. Remove any existing webpack cache files (*.pack, *.map)
2. Specifically target the problematic file mentioned in the error
3. Scan your project for any other large files and offer to remove them

## Setup Requirements

Before deploying, ensure you have:

1. A Cloudflare account
2. An R2 Storage bucket created in your Cloudflare account
3. A Cloudflare Pages project set up (preferably with the same name as your repository)
4. A Cloudflare API token with the necessary permissions (R2, Pages, Workers)

The following environment variables must be set for deployments:
- `CLOUDFLARE_API_TOKEN` - Your Cloudflare API token
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID
- `R2_BUCKET_NAME` - The name of your R2 bucket
- `CLOUDFLARE_PAGES_PROJECT` - Your Cloudflare Pages project name (default: "pantrypal")

## Deployment Options

### Automated Deployment via GitHub Actions

This repository includes a GitHub Actions workflow that automatically deploys the application when changes are pushed to the `main` or `master` branch.

For automated deployments:
1. Add the required secrets to your GitHub repository:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `R2_BUCKET_NAME`
   - `CLOUDFLARE_PAGES_PROJECT` (optional, defaults to "pantrypal")
2. Push changes to the `main` or `master` branch to trigger the deployment

The workflow in `.github/workflows/deploy-with-r2.yml` handles building the application, uploading the build artifacts to R2, and deploying to Cloudflare Pages.

### Manual Deployment from Local Machine

#### For macOS/Linux Users:

```bash
# Set required environment variables
export CLOUDFLARE_API_TOKEN=your_api_token
export CLOUDFLARE_ACCOUNT_ID=your_account_id
export R2_BUCKET_NAME=your_bucket_name
export CLOUDFLARE_PAGES_PROJECT=your_project_name  # Optional, defaults to "pantrypal"

# Run the deployment script
./deploy-with-r2.sh
```

#### For Windows PowerShell Users:

```powershell
# Set required environment variables
$env:CLOUDFLARE_API_TOKEN = "your_api_token"
$env:CLOUDFLARE_ACCOUNT_ID = "your_account_id"
$env:R2_BUCKET_NAME = "your_bucket_name"
$env:CLOUDFLARE_PAGES_PROJECT = "your_project_name"  # Optional, defaults to "pantrypal"

# Run the build script
./build-pages.ps1

# Upload to R2 and deploy using PowerShell
# This requires the installation of curl for Windows
curl.exe -X PUT "https://api.cloudflare.com/client/v4/accounts/$env:CLOUDFLARE_ACCOUNT_ID/r2/buckets/$env:R2_BUCKET_NAME/objects/pages-build.zip" `
  -H "Authorization: Bearer $env:CLOUDFLARE_API_TOKEN" `
  -H "Content-Type: application/zip" `
  --data-binary @pages-build.zip

# Create a deployment
curl.exe -X POST "https://api.cloudflare.com/client/v4/accounts/$env:CLOUDFLARE_ACCOUNT_ID/pages/projects/$env:CLOUDFLARE_PAGES_PROJECT/deployments" `
  -H "Authorization: Bearer $env:CLOUDFLARE_API_TOKEN" `
  -H "Content-Type: application/json" `
  --data "{\"production\": {\"r2_bucket\": \"$env:R2_BUCKET_NAME\", \"r2_object\": \"pages-build.zip\"}}"

# Set worker permissions (wait a few seconds after the previous command)
curl.exe -X PATCH "https://api.cloudflare.com/client/v4/accounts/$env:CLOUDFLARE_ACCOUNT_ID/pages/projects/$env:CLOUDFLARE_PAGES_PROJECT/deployments/latest" `
  -H "Authorization: Bearer $env:CLOUDFLARE_API_TOKEN" `
  -H "Content-Type: application/json" `
  --data "{\"deployment_configs\":{\"production\":{\"compatibility_flags\":[\"streams_enable_constructors\"],\"compatibility_date\":\"2023-10-30\",\"usage_model\":\"bundled\"}}}"
```

## Custom Build Scripts

Due to compatibility issues with `@cloudflare/next-on-pages` on Windows, we've created custom build scripts that work cross-platform. These scripts:

1. Build the Next.js application
2. Set up the correct directory structure for Cloudflare Pages
3. Create a simplified worker script that properly handles static assets and routes
4. Generate a `_routes.json` file for Cloudflare Pages routing
5. **Exclude large files** (*.pack, *.map, and any file >20MB)
6. Create an archive ready for upload to R2

Available scripts:
- `build-pages.sh` for macOS/Linux
- `build-pages.ps1` for Windows PowerShell

## Worker Permissions and Compatibility

After deploying to Cloudflare Pages, we set specific worker permissions and compatibility flags to ensure proper functioning:

```json
{
  "deployment_configs": {
    "production": {
      "compatibility_flags": ["streams_enable_constructors"],
      "compatibility_date": "2023-10-30", 
      "usage_model": "bundled"
    }
  }
}
```

This configuration helps prevent Error 1019 (authentication/permission issues) that can occur with Cloudflare deployments.

## Cloudflare Console Configuration

For the R2 deployment method to work properly, you need to configure your Cloudflare Pages project:

1. **Disable automatic GitHub deployments**:
   - Go to Cloudflare Dashboard > Pages > Your Project > Settings
   - Under "Builds & deployments", disable "Automatic deployments"
   - This prevents Cloudflare from trying to build your site itself

2. **Set the correct Build Output Directory**:
   - Go to Cloudflare Dashboard > Pages > Your Project > Settings > Build settings
   - Set "Build output directory" to `/.vercel/output/static`
   - This tells Cloudflare where to find your site files within the uploaded archive

3. **Verify Direct Upload is enabled**:
   - Go to Cloudflare Dashboard > Pages > Your Project > Settings
   - Check that "Direct Upload" or "Custom deployment" is enabled

4. **Verify your project name**:
   - Ensure the project name in your deployment scripts matches exactly what's in Cloudflare
   - The project name is case-sensitive

## npm Scripts

The following npm scripts are available:

```json
"scripts": {
  "pages:build": "bash build-pages.sh",
  "pages:build:win": "powershell -File build-pages.ps1",
  "pages:deploy": "bash deploy-with-r2.sh"
}
```

Usage:
- `npm run pages:build` - Build the application for Cloudflare Pages (macOS/Linux)
- `npm run pages:build:win` - Build the application for Cloudflare Pages (Windows)
- `npm run pages:deploy` - Build and deploy the application (requires environment variables)

## Disabling Automatic Cloudflare Deployments

If you have connected your GitHub repository to Cloudflare Pages directly, you should disable automatic deployments to prevent duplicate deployments:

1. Go to your Cloudflare Pages project settings
2. Navigate to the "Builds & deployments" section
3. Set "Automatic deployments" to "Disabled"

## Troubleshooting

### Invalid wrangler.toml Error

If you see the error "A wrangler.toml file was found but it does not appear to be valid":

1. **Check that your wrangler.toml file contains the required properties**: The most critical property is `pages_build_output_dir`.

2. **Let the deployment script handle it**: Our updated deployment scripts will automatically create or update the wrangler.toml file with the correct configuration.

3. **Verify the file syntax**: Make sure there are no syntax errors in the TOML format.

### "Output directory '.vercel/output/static' not found" Error

If you see this error, it means Cloudflare can't find the expected directory in your deployment artifact. This could be due to:

1. **Directory structure issue**: Our updated build scripts now preserve the `.vercel/output/static` path when creating the archive. Make sure you're using the latest version.

2. **Build output directory setting**: Ensure "Build output directory" in your Cloudflare Pages settings is set to `/.vercel/output/static`.

3. **Manual fix for existing archives**: If you need to fix an existing archive:
   ```bash
   # Extract the archive
   mkdir -p temp-extract
   tar -xf pages-build.tar.gz -C temp-extract
   
   # Create the correct structure
   mkdir -p temp-new/.vercel/output
   cp -r temp-extract/* temp-new/.vercel/output/static/
   
   # Create a new archive
   tar -czf pages-build-fixed.tar.gz -C temp-new .
   ```

### Project Not Found Error

If you see this error:
```
"Project not found. The specified project name does not match any of your existing projects."
```

Make sure:
1. You've set the correct project name in your environment with `CLOUDFLARE_PAGES_PROJECT`
2. The project name exactly matches what's in Cloudflare (case-sensitive)
3. The API token has the necessary permissions to access this project

### File Size Limits (25 MiB)

If you encounter the error "Pages only supports files up to 25 MiB in size":

1. **Use the fix scripts**: Run either `./fix-large-files.sh` (Linux/macOS) or `./fix-large-files.ps1` (Windows) to automatically remove large files
2. **Clean webpack cache**: Remove webpack cache with `rm -rf .next/cache cache/webpack` (Linux/macOS) or `Remove-Item -Recurse -Force .next/cache, cache/webpack` (Windows)
3. **Update next.config.mjs**: Make sure your Next.js config has cache disabled and smaller chunk sizes:
   ```js
   webpack: (config) => {
     config.cache = false;
     config.optimization.splitChunks = {
       chunks: 'all',
       maxSize: 15000000, // 15MB max chunk
     };
     return config;
   }
   ```
4. **Use .cfignore**: Add a `.cfignore` file to exclude large files during deployment

### Common Large Files

These are the files that commonly exceed the 25MB limit:
- `cache/webpack/client-production/0.pack` (most common)
- `.next/cache/webpack/*/**.pack`
- Large images or media files in public directory
- Development bundles in `.next/static/development`

### Error 1019 (Authentication/Permission Issue)

If you encounter error 1019 when accessing your deployed site, this indicates an authentication or permission issue. Common causes include:

1. **Worker Permissions**: Ensure the worker has the correct permissions by setting compatibility flags and dates as shown in the deployment scripts.

2. **Route Configuration**: Make sure your `_routes.json` file correctly includes all necessary routes.

3. **Worker Script Issues**: The simplified worker script in our build process is designed to handle routes properly. If you see 1019 errors, check if your worker script is handling routes correctly.

4. **API Token Permissions**: Verify your Cloudflare API token has all required permissions:
   - Account.R2 Storage: Edit
   - Account.Workers Scripts: Edit
   - Account.Pages: Edit

### Windows Compatibility

The `@cloudflare/next-on-pages` package may have reliability issues on Windows. Use our custom `build-pages.ps1` script instead of directly using the package.

### Build Errors - Node.js Modules

If you encounter errors related to Node.js built-in modules, check the `next-on-pages.config.js` configuration to ensure all required modules are polyfilled correctly.

### R2 Upload Failures

If uploads to R2 fail:
1. Check that your API token has the correct permissions
2. Verify the R2 bucket exists and is accessible
3. Ensure the environment variables are set correctly

### Authentication Issues with Wrangler

The deployment scripts now use direct API calls instead of Wrangler to avoid authentication issues. 