# PantryPal Email Templates

This directory contains email templates for AWS Cognito user communications.

## Welcome Email Templates

These templates are used when creating new users in AWS Cognito. They provide a friendlier and more on-brand message than the default AWS templates.

- `welcome-email-html.html` - HTML email content
- `welcome-email-subject.txt` - Email subject line

## Verification Code Templates

These templates are used when users request to change their password. They contain the verification code needed to complete the password change process.

- `verification-code-html.html` - HTML email content
- `verification-code-subject.txt` - Email subject line

### How to Use with AWS Cognito

1. **Access the AWS Cognito Console**:
   - Go to the [AWS Cognito Console](https://console.aws.amazon.com/cognito/home)
   - Select your User Pool

2. **Configure Message Templates**:
   - Navigate to "Message Templates" in the left sidebar
   - Select either:
     - "Invitation message" for welcome emails
     - "Verification message" for verification codes

3. **Set Up the Email Templates**:
   - For **Subject Line**: Copy and paste the content from the appropriate subject file
   - For **Email Message**: 
     - Select "HTML" option
     - Copy and paste the content from the appropriate HTML file

4. **Verify the Templates**:
   - Ensure all placeholder variables (`{username}`, `{####}`, etc.) are preserved
   - These variables will be automatically replaced with the actual values

5. **Save Changes**:
   - Click "Save changes" at the bottom of the page

### Important Notes

- The HTML templates include styling which may be partially supported depending on the email client
- Always preserve the placeholder variables:
  - `{username}` will be replaced with the user's username
  - `{####}` will be replaced with either the temporary password or verification code
- Always test the templates by creating a test user or requesting a test verification code before using in production
- The subject lines include emojis which may not display correctly in all email clients but will gracefully degrade

## Template Variables

AWS Cognito supports the following variables for various message types:

- `{username}` - The user's username
- `{####}` - The temporary password or verification code
- `{username_without_domain}` - For email addresses as usernames, only the part before @
- `{domain}` - For email addresses as usernames, only the domain part after @

## Customization

Feel free to customize these templates to match your branding needs. Just ensure you keep the required variables intact. 