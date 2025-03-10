This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Deployment

This project uses a two-step deployment process to handle large Next.js builds:

1. Build artifacts are uploaded to Cloudflare R2 storage
2. Cloudflare Pages pulls the artifacts from R2 for deployment

### Setup Required Secrets

For GitHub Actions deployment, add these secrets to your repository:

- `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token with R2 and Pages permissions
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID
- `R2_BUCKET_NAME`: The name of your R2 bucket for artifacts

### Manual Deployment

To deploy manually, use the provided script:

```bash
# Set required environment variables
export CLOUDFLARE_API_TOKEN=your_token
export CLOUDFLARE_ACCOUNT_ID=your_account_id
export R2_BUCKET_NAME=your_bucket_name

# Run the deployment script
./deploy-with-r2.sh
```

### Disabling Automatic Cloudflare Pages Deployments

To ensure only the R2 deployment method is used (and prevent duplicate deployments), follow these steps:

1. **Log in to the Cloudflare Dashboard** at [https://dash.cloudflare.com/](https://dash.cloudflare.com/)
2. **Navigate to Pages** and select your project
3. **Access Project Settings** by clicking on the "Settings" tab
4. **Find the "Builds & deployments" section**
5. **Disable GitHub Integration** by toggling off "Enable GitHub deployments" or clicking "Disconnect" on your GitHub repository connection
6. **Save your changes**

Alternatively, you can change the Production branch to a non-existent branch name (like "manual-deploy-only") to prevent automatic deployments while keeping the GitHub integration.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## reCAPTCHA Configuration

This application uses Google reCAPTCHA v3 (invisible) to protect against automated login attempts. Follow these steps to set it up:

1. Go to the [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Sign in with a Google account
3. Register a new site:
   - Enter a label (e.g., "My Application")
   - Select **reCAPTCHA v3**
   - Add your domains (e.g., localhost for development, your production domain)
   - Accept the terms of service and click "Submit"

4. You will receive two keys:
   - Site Key: This is public and goes in your frontend code
   - Secret Key: This is private and should be kept secure

5. Add these keys to your .env file:
   ```
   NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-site-key-here
   RECAPTCHA_SECRET_KEY=your-secret-key-here
   ```

6. Restart your application

reCAPTCHA v3 is invisible to the user and assigns a score (0.0 to 1.0) to each login attempt based on how likely it is to be human. The application will reject login attempts with scores below 0.3.

### Troubleshooting reCAPTCHA Issues

If you see the error "reCAPTCHA verification failed. Please try again." or similar messages, check these common issues:

1. **Domain Mismatch**: Ensure the domain you're testing on is listed in the reCAPTCHA admin console
   - For local testing, make sure `localhost` is added
   - For custom local domains, add them to your hosts file AND the reCAPTCHA settings

2. **Key Configuration**: Verify your keys are correctly set in the .env file
   - Double-check for typos or extra spaces in the keys
   - Make sure you're using v3 keys, not v2

3. **Network Issues**: Check if your network might be blocking Google's reCAPTCHA service
   - Some corporate networks or VPNs may interfere with reCAPTCHA
   - Try on a different network if possible

4. **Browser Extensions**: Some privacy extensions can block reCAPTCHA
   - Try temporarily disabling ad blockers or privacy extensions

5. **Script Loading**: Ensure the reCAPTCHA script is loading properly
   - Check your browser console for any script loading errors

6. **"reCAPTCHA returned empty token" Error**:
   - This occurs when reCAPTCHA generates a null/empty token during login
   - Common causes:
     - Script loading issues or race conditions
     - Network connectivity problems to Google services
     - Browser privacy settings blocking the token generation
   - The application automatically switches to fallback mode after failed attempts
   - Try clearing your browser cache, disabling strict privacy settings, or using a different browser

7. **"Cannot read properties of undefined (reading 'hpm')" Error**:
   - This is a known issue with reCAPTCHA v3 and certain versions of React
   - The error is harmless and doesn't affect functionality
   - The application includes error suppression code to prevent it from appearing in the console
   - If you're still seeing this error, try clearing your browser cache or using a different browser

For developers: You can see detailed error information in the server logs when running in development mode.

### Fallback Mode

The application includes a reCAPTCHA fallback mode that activates in these scenarios:
- When reCAPTCHA services cannot be reached
- When token generation fails repeatedly
- In development mode when configuration is incomplete

Fallback mode is intended for:
1. Development and testing without needing to set up reCAPTCHA
2. Emergency access when Google services are unreachable
3. Providing graceful degradation in case of reCAPTCHA failures

**Note:** Fallback mode reduces security and should be disabled or restricted in production environments based on your security requirements.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
