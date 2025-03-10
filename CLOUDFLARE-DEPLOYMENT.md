# Deploying to Cloudflare Pages with R2 Storage

This document outlines the process for deploying the Next.js application to Cloudflare Pages using R2 Storage as an intermediary step to handle large build artifacts.

## Why This Approach?

Cloudflare Pages has size limits for direct deployments that our Next.js application might exceed. By using R2 Storage as an intermediary, we can:

1. Build the application locally or in CI
2. Upload the build artifacts to R2 Storage
3. Download and deploy these artifacts to Cloudflare Pages

## Setup Requirements

Before deploying, ensure you have:

1. A Cloudflare account
2. R2 Storage bucket created
3. Cloudflare Pages project set up
4. Cloudflare API token with appropriate permissions
5. Required environment variables set:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `R2_BUCKET_NAME`

## Deployment Options

### Option 1: Automated Deployment via GitHub Actions

When you push to the `main` or `master` branch, the GitHub workflow will:

1. Build the application
2. Upload the build artifacts to R2
3. Deploy to Cloudflare Pages

You can also manually trigger this workflow from the GitHub Actions tab.

### Option 2: Manual Deployment from Local Machine

#### For macOS/Linux/Git Bash:

```bash
# Set required environment variables
export CLOUDFLARE_API_TOKEN=your_token
export CLOUDFLARE_ACCOUNT_ID=your_account_id
export R2_BUCKET_NAME=your_bucket_name

# Run the deployment script
./deploy-with-r2.sh
```

#### For Windows PowerShell:

```powershell
# Set required environment variables
$env:CLOUDFLARE_API_TOKEN = "your_token"
$env:CLOUDFLARE_ACCOUNT_ID = "your_account_id"
$env:R2_BUCKET_NAME = "your_bucket_name"

# Build using PowerShell script
./build-pages.ps1

# Deploy manually
# (You'll need to run similar steps to the deploy-with-r2.sh script)
```

## Custom Build Scripts

Because of compatibility issues with `@cloudflare/next-on-pages` on Windows, we've created custom build scripts:

- `build-pages.sh` - For Bash/Unix environments
- `build-pages.ps1` - For Windows PowerShell

These scripts:
1. Build the Next.js application
2. Create the expected Cloudflare Pages directory structure
3. Generate a compatible _worker.js file
4. Package everything for deployment

## Npm Scripts

The following npm scripts are available:

```bash
# Build using the appropriate script for your platform
npm run build:pages:bash     # For Unix-like systems
npm run build:pages:windows  # For Windows

# Deploy (requires environment variables)
npm run deploy:r2

# For testing/development with next-on-pages (may not work on Windows)
npm run pages:build
npm run pages:dev
```

## Disabling Automatic Cloudflare Deployments

If you've linked your GitHub repository to Cloudflare Pages directly, you may want to disable automatic deployments to prevent duplicate deployments:

1. Log in to Cloudflare Dashboard
2. Navigate to Pages > Your Project > Settings
3. Under "Builds & deployments", disable GitHub integration or set a non-existent branch as the production branch

## Troubleshooting

### Common Issues:

1. **Windows Compatibility**: `next-on-pages` doesn't work reliably on Windows. Use the PowerShell script or WSL.
2. **Build Errors**: Check for any Node.js built-in modules that might not be supported in Cloudflare Workers.
3. **R2 Upload Failures**: Verify your API token has the correct permissions.
4. **Wrangler Auth Issues**: Run `wrangler login` to authenticate with Cloudflare. 