# Authentication Setup

This application uses AWS Cognito for authentication.

## AWS Cognito Setup

### Prerequisites
1. AWS Account
2. AWS Cognito User Pool created
3. Cognito App Client configured within the User Pool

### Configuration

1. Update your `.env` file at the root of the project with the following variables:

```
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-actual-access-key-id
AWS_SECRET_ACCESS_KEY=your-actual-secret-access-key

# AWS Cognito Configuration
COGNITO_USER_POOL_ID=us-east-1_abcdefghi  # Format: region_poolid
COGNITO_CLIENT_ID=1abc2defghij3klmn4opqr5st  # Must be the actual Client ID
```

2. Replace the placeholder values with your actual AWS credentials and Cognito configuration.

> **Important**: For Cognito Client IDs, you must use the actual value from your AWS console. The Client ID must match the pattern `[\w+]+` (alphanumeric characters and underscores only, no hyphens).

### Handling "Force Change Password" State

When users are created in the AWS Cognito console, they are often placed in a "FORCE_CHANGE_PASSWORD" state, requiring them to change their password on first login. This application handles this flow automatically:

1. When a user in FORCE_CHANGE_PASSWORD state attempts to login, they will see a password change form directly in the login page
2. After setting a new password, they will be logged in automatically
3. Subsequent logins will use the new password

If you want to skip this step when creating users in the AWS console:
- In the AWS Cognito console, when creating a user, uncheck "Send an invitation to this new user?"
- Set a permanent password instead of a temporary one
- Uncheck "Mark phone number as verified?" unless you've verified it
- Check "Mark email as verified" if you're sure of the email address

### Troubleshooting Environment Variables

If you're experiencing issues with environment variables:

1. Access the debug endpoint at `/api/check-env` to see which variables are loaded
2. Make sure your Client ID follows the correct format (alphanumeric with no hyphens)
3. Restart your Next.js server after making changes to the `.env` file
4. In production, set environment variables through your hosting provider

### Troubleshooting Password Change Flow

If you encounter issues with the "Force change password" flow:

1. **Password Change Process**: The app now uses an integrated approach:
   - After successful authentication that requires a password change, the login page automatically switches to a password change form
   - This avoids redirection issues that can occur with middleware interception
   - The session token is maintained in memory during the process

2. **Password Requirements**: Cognito has strict password requirements by default:
   - Minimum length of 8 characters
   - Contains at least one uppercase letter
   - Contains at least one lowercase letter
   - Contains at least one number
   - Contains at least one special character

3. **Console Debugging**: If experiencing issues, check the browser console which contains detailed logs about:
   - Authentication challenges detected
   - Session token availability
   - Password change attempts

4. **Bypassing Password Change**: If you prefer to avoid the password change flow:
   - Go to AWS Cognito Console > User Pools > [Your Pool] > Users
   - Find your user and select "Reset password"
   - Choose "Set as permanent" (not temporary)
   - This will change the user's status from FORCE_CHANGE_PASSWORD to CONFIRMED

### Getting Valid Cognito IDs

1. **User Pool ID**: 
   - Go to AWS Console → Amazon Cognito → User Pools
   - Select your user pool
   - The User Pool ID is displayed on the "User pool overview" page (format: region_alphanumeric)

2. **Client ID**:
   - Go to AWS Console → Amazon Cognito → User Pools
   - Select your user pool
   - Navigate to the "App integration" tab
   - Under "App clients and analytics," find your app client
   - Copy the Client ID (format: alphanumeric string)

### User Setup

Users need to be created in your Cognito User Pool. You can:
- Create users through the AWS Console
- Allow users to sign up through your application (requires additional configuration)
- Use the AWS CLI or SDK to programmatically create users

## Authentication Flow

1. User submits login credentials
2. Credentials are verified against AWS Cognito
3. If valid, Cognito returns tokens (ID, Access, Refresh)
4. If user needs to change password, they are prompted with a password change form
5. The application stores the ID token and uses it for authenticated requests
6. Token expiration is managed client-side, with automatic logout on expiration

## Security Notes

- Be careful with sensitive information in your `.env` file
- For production, ensure proper Cognito security settings (password policies, MFA, etc.)
- Review AWS IAM permissions for your Cognito setup
- Consider implementing refresh token logic for longer sessions 