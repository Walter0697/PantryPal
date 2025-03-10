# Disabling Automatic Cloudflare Pages Deployments

To ensure only our custom R2-based deployment method is used, follow these steps to disable the automatic deployments in Cloudflare Pages:

## Steps to Disable Automatic Deployments

1. **Log in to the Cloudflare Dashboard**
   - Go to [https://dash.cloudflare.com/](https://dash.cloudflare.com/)
   - Sign in with your account credentials

2. **Navigate to Pages**
   - Click on "Pages" in the left sidebar

3. **Select Your Project**
   - Click on the "pantrypal" project (or whatever name your project is using)

4. **Access Project Settings**
   - Click on the "Settings" tab at the top of the page

5. **Find and Update Build Settings**
   - Scroll down to the "Builds & deployments" section
   - Click on "Configure Production deployments" or "Build configurations"

6. **Disable GitHub Integration**
   - Look for the Git integration settings
   - Toggle off "Enable GitHub deployments" or a similar option
   - Alternatively, you may need to:
     - Click "Disconnect" on your GitHub repository connection
     - Or select "Pause automatic deployments"

7. **Save Your Changes**
   - Click the "Save" button to apply your changes

## Alternative: Configure a Custom Production Branch

If you want to keep GitHub integration but prevent automatic deployments from your main branch:

1. In the same "Builds & deployments" section
2. Change the Production branch to something other than your active branches, like "manual-deploy-only"
3. This will prevent automatic deployments since this branch doesn't exist

## Verifying the Setup

After making these changes:

1. Push a change to your repository
2. Verify that Cloudflare Pages doesn't automatically start a deployment
3. Run your GitHub workflow or manual script
4. Confirm that only your R2-based deployment is running

## Troubleshooting

If automatic deployments still occur:
- Double-check that you've saved your settings changes
- Make sure you're changing settings for the correct project/environment 
- It might take a few minutes for settings to propagate
- If using the custom branch approach, ensure the branch name doesn't match any existing branch 