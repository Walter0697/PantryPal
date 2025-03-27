'use server';

import jwt from 'jsonwebtoken';
import { 
  CognitoIdentityProviderClient, 
  InitiateAuthCommand,
  AuthFlowType,
  RespondToAuthChallengeCommand,
  ChallengeNameType,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  UpdateUserAttributesCommand,
  GetUserAttributeVerificationCodeCommand
} from '@aws-sdk/client-cognito-identity-provider';

// Import storage-related utilities
import { getAreas } from '../util/server-only/gridStorage';
import { getAreaItems } from '../util/server-only/storageStorage';
import { StorageItem } from '../util/storageItems';

// Get AWS credentials 
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID;
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

// JWT expiration time (in seconds) - 24 hours
const JWT_EXPIRATION = 24 * 60 * 60;

// Create Cognito client
const cognitoClient = new CognitoIdentityProviderClient({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID || '',
    secretAccessKey: AWS_SECRET_ACCESS_KEY || ''
  }
});

// Add the reCAPTCHA verification function for v3
async function verifyRecaptcha(token: string): Promise<{ success: boolean; score?: number; error?: string }> {
  // Special case: fallback mode
  if (token === 'FALLBACK_MODE') {
    // In fallback mode, we accept the request but with reduced security
    // This should only be used for debugging or when reCAPTCHA is completely inaccessible
    return { success: true, score: 0.5 };
  }

  try {
    // Validation check for token format
    if (!token || token.length < 20) {
      return { success: false, error: 'Invalid token format' };
    }

    // Get the secret key from environment variables
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    
    if (!secretKey) {
      // In development, allow fallback if secret key is missing
      if (process.env.NODE_ENV !== 'production') {
        return { success: true, score: 0.5 };
      }
      return { success: false, error: 'Missing configuration' };
    }
    
    // Make a request to the Google reCAPTCHA verification API
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });
    
    // Handle non-200 responses
    if (!response.ok) {
      return { 
        success: false, 
        error: `API error: ${response.status}` 
      };
    }
    
    // Parse the response
    const data = await response.json();
    
    // For v3, we get a score from 0.0 to 1.0 (1.0 is very likely a human)
    // You can adjust the threshold based on your security needs
    const minAcceptableScore = 0.3; // More permissive threshold for testing
    
    if (data.success === true) {
      // Return success and score
      return { 
        success: data.score >= minAcceptableScore,
        score: data.score 
      };
    }
    
    // If success is false, something went wrong with verification
    return { 
      success: false, 
      error: Array.isArray(data['error-codes']) ? data['error-codes'].join(', ') : 'Unknown verification error'
    };
  } catch (error: any) {
    return { 
      success: false, 
      error: error?.message || 'Network or server error'
    };
  }
}

// This is a server action for authentication
export async function authenticate(formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;
  const recaptchaToken = formData.get('recaptchaToken') as string;

  // Simple validation
  if (!username || !password) {
    return { success: false, message: 'Username and password are required' };
  }
  
  // Verify reCAPTCHA token
  if (!recaptchaToken) {
    return { success: false, message: 'Security verification failed. Please refresh the page and try again.' };
  }
  
  // Verify the reCAPTCHA token
  const recaptchaResult = await verifyRecaptcha(recaptchaToken);
  
  // Handle the verification result
  if (!recaptchaResult.success) {
    // For production, we don't want to reveal too much about the failure
    const isProduction = process.env.NODE_ENV === 'production';
    const message = isProduction
      ? 'Security verification failed. Please try again.'
      : `reCAPTCHA verification failed: ${recaptchaResult.error || 'Unknown error'}`;
      
    return { success: false, message };
  }

  try {
    // Validate configuration
    if (!COGNITO_CLIENT_ID || !COGNITO_USER_POOL_ID) {
      return { success: false, message: 'Authentication service misconfigured. Please check environment variables.' };
    }

    // Check if client ID is still a placeholder or has invalid format
    if (COGNITO_CLIENT_ID.includes('your-') || COGNITO_CLIENT_ID.includes('-') || !(/^[\w+]+$/.test(COGNITO_CLIENT_ID))) {
      return { 
        success: false, 
        message: 'Authentication service misconfigured. Client ID has invalid format. Please update your .env file.' 
      };
    }

    // Use Cognito authentication
    const authCommand = new InitiateAuthCommand({
      AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
      ClientId: COGNITO_CLIENT_ID,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password
      }
    });

    const response = await cognitoClient.send(authCommand);
    
    // Check for NEW_PASSWORD_REQUIRED challenge
    if (response.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
      return {
        success: false,
        challengeName: 'NEW_PASSWORD_REQUIRED',
        message: 'You need to change your password before logging in',
        session: response.Session,
        username
      };
    }

    if (!response.AuthenticationResult?.IdToken) {
      return { success: false, message: 'Authentication failed' };
    }

    // Use the IdToken from Cognito as our app's token
    const token = response.AuthenticationResult.IdToken;
    const expiresIn = response.AuthenticationResult.ExpiresIn || JWT_EXPIRATION;

    return {
      success: true,
      message: 'Login successful',
      token,
      expiresIn
    };
  } catch (error: any) {
    // Return appropriate error message based on the error
    if (error.name === 'UserNotFoundException' || error.name === 'NotAuthorizedException') {
      return { success: false, message: 'Invalid username or password' };
    } else if (error.name === 'InvalidParameterException') {
      return { success: false, message: 'Invalid login parameters' };
    } else {
      return { 
        success: false, 
        message: process.env.NODE_ENV === 'production' 
          ? 'Authentication failed. Please try again.' 
          : `Error: ${error.message}` 
      };
    }
  }
}

// Function to verify a JWT token - can be used by server components/actions
export async function verifyToken(token: string) {
  if (!token) {
    return { valid: false, error: 'No token provided' };
  }

  try {
    // Cognito tokens should be verified against Cognito's public keys
    // in a production environment
    const decoded = jwt.decode(token);
    if (decoded && typeof decoded === 'object' && decoded.sub) {
      // We're just decoding to check structure here
      // In production, implement proper JWT validation with Cognito's JWKS
      return { valid: true, decoded, source: 'cognito' };
    }
    
    // If we get here, the token is invalid
    throw new Error('Invalid token format');
  } catch (error: any) {
    console.error('Token verification error:', error);
    return { 
      valid: false, 
      error: process.env.NODE_ENV === 'production' 
        ? 'Invalid authentication token' 
        : `Token error: ${error.message}` 
    };
  }
}

// Additional action for completing password change
export async function completeNewPassword(
  username: string, 
  newPassword: string, 
  session: string,
  email?: string  // Optional email parameter
) {
  try {
    // Validate configuration
    if (!COGNITO_CLIENT_ID || !COGNITO_USER_POOL_ID) {
      return { success: false, message: 'Authentication service misconfigured. Please check environment variables.' };
    }

    // The challenge responses for the username and password
    const challengeResponses: Record<string, string> = {
      USERNAME: username,
      NEW_PASSWORD: newPassword,
    };

    // Only add email-related attributes if email parameter is provided
    // BUT DO NOT TRY TO SET email_verified directly since it's non-mutable
    if (email) {
      // Add the email attribute - but don't try to set email_verified
      challengeResponses['email'] = email;
      
      // Add in different formats that Cognito might expect
      challengeResponses['userAttributes.email'] = email;
      
      // JSON format for user attributes - without email_verified
      const userAttributesJson = JSON.stringify({ email: email });
      challengeResponses['userAttributes'] = userAttributesJson;
    }

    // For Cognito, user attributes must be provided separately in the request
    const respondToAuthChallengeCommand = new RespondToAuthChallengeCommand({
      ClientId: COGNITO_CLIENT_ID,
      ChallengeName: 'NEW_PASSWORD_REQUIRED' as ChallengeNameType,
      Session: session,
      ChallengeResponses: challengeResponses,
      // Simple client metadata without trying to verify email
      ClientMetadata: email ? { email: email } : undefined
    });

    try {
      const response = await cognitoClient.send(respondToAuthChallengeCommand);
      
      if (!response.AuthenticationResult?.IdToken) {
        return { success: false, message: 'Failed to set new password' };
      }

      // Return success with token information
      return {
        success: true,
        message: 'Password changed successfully!',
        token: response.AuthenticationResult.IdToken,
        expiresIn: response.AuthenticationResult.ExpiresIn || 3600
      };
    } catch (cognitoError: any) {
      // Try an alternative approach if there's an error
      if (cognitoError.message && cognitoError.message.includes('attributes given')) {
        // Try again with minimal attributes
        const altChallengeResponses = { 
          USERNAME: username,
          NEW_PASSWORD: newPassword
        };
        
        try {
          const altCommand = new RespondToAuthChallengeCommand({
            ClientId: COGNITO_CLIENT_ID,
            ChallengeName: 'NEW_PASSWORD_REQUIRED' as ChallengeNameType,
            Session: session,
            ChallengeResponses: altChallengeResponses
          });
          
          const altResponse = await cognitoClient.send(altCommand);
          
          if (altResponse.AuthenticationResult?.IdToken) {
            return {
              success: true,
              message: 'Password changed successfully!',
              token: altResponse.AuthenticationResult.IdToken,
              expiresIn: altResponse.AuthenticationResult.ExpiresIn || 3600
            };
          }
        } catch (altError: any) {
          return { 
            success: false, 
            message: `Could not change password: ${altError.message || 'Unknown error'}` 
          };
        }
      }
      
      return { 
        success: false, 
        message: `Could not change password: ${cognitoError.message || 'Unknown error'}` 
      };
    }
  } catch (error: any) {
    return { 
      success: false, 
      message: process.env.NODE_ENV === 'production' 
        ? 'Failed to set new password. Please try again.' 
        : `Error: ${error.message}` 
    };
  }
}

// Forgot password functionality - this initiates the reset process
export async function forgotPassword(usernameOrEmail: string) {
  try {
    // Validate configuration
    if (!COGNITO_CLIENT_ID || !COGNITO_USER_POOL_ID) {
      return { success: false, message: 'Password reset service misconfigured. Please check environment variables.' };
    }

    // Create the forgot password command
    const forgotPasswordCommand = new ForgotPasswordCommand({
      ClientId: COGNITO_CLIENT_ID,
      Username: usernameOrEmail // Try with whatever the user entered
    });

    // Send the command to Cognito
    await cognitoClient.send(forgotPasswordCommand);
    
    // If we get here without an error, the reset was initiated successfully
    return {
      success: true, 
      message: 'Password reset initiated! Check your email for a confirmation code.'
    };
  } catch (error: any) {
    // Handle specific error cases with user-friendly messages
    if (error.name === 'UserNotFoundException') {
      // Don't reveal if the user exists or not for security reasons
      return { 
        success: false, 
        message: 'If your account exists, you will receive an email with reset instructions.' 
      };
    } else if (error.name === 'InvalidParameterException') {
      return { 
        success: false, 
        message: 'Please provide a valid username or email address.' 
      };
    } else if (error.name === 'LimitExceededException') {
      return { 
        success: false, 
        message: 'Too many attempts. Please wait a while before trying again.' 
      };
    } else {
      return { 
        success: false, 
        message: process.env.NODE_ENV === 'production' 
          ? 'An error occurred. Please try again later.' 
          : `Error: ${error.message}` 
      };
    }
  }
}

// Confirm forgot password with code from email
export async function confirmForgotPassword(
  username: string, 
  confirmationCode: string, 
  newPassword: string
) {
  try {
    // Validate configuration
    if (!COGNITO_CLIENT_ID || !COGNITO_USER_POOL_ID) {
      return { success: false, message: 'Password reset service misconfigured. Please check environment variables.' };
    }

    // Create the confirmation command
    const confirmForgotPasswordCommand = new ConfirmForgotPasswordCommand({
      ClientId: COGNITO_CLIENT_ID,
      Username: username,
      ConfirmationCode: confirmationCode,
      Password: newPassword
    });

    // Send the command to Cognito
    await cognitoClient.send(confirmForgotPasswordCommand);
    
    // If we get here without an error, the password was reset successfully
    return {
      success: true, 
      message: 'Password reset successful! You can now log in with your new password.'
    };
  } catch (error: any) {
    // Handle specific error cases with user-friendly messages
    if (error.name === 'CodeMismatchException') {
      return { 
        success: false, 
        message: 'Invalid verification code. Please check and try again.' 
      };
    } else if (error.name === 'InvalidPasswordException') {
      return { 
        success: false, 
        message: error.message || 'Password does not meet requirements. Please choose a stronger password.' 
      };
    } else if (error.name === 'ExpiredCodeException') {
      return { 
        success: false, 
        message: 'Verification code has expired. Please request a new code.' 
      };
    } else {
      return { 
        success: false, 
        message: process.env.NODE_ENV === 'production' 
          ? 'An error occurred during password reset. Please try again.' 
          : `Error: ${error.message}` 
      };
    }
  }
}

// Update user attributes (like email)
export async function updateUserEmail(token: string, email: string) {
  try {
    // Validate configuration
    if (!COGNITO_CLIENT_ID || !COGNITO_USER_POOL_ID) {
      return { success: false, message: 'User update service misconfigured. Please check environment variables.' };
    }

    // Create the update user attributes command
    const updateCommand = new UpdateUserAttributesCommand({
      AccessToken: token, // Requires a valid access token from the current session
      UserAttributes: [
        {
          Name: 'email',
          Value: email
        }
      ]
    });

    // Send the command to Cognito
    await cognitoClient.send(updateCommand);
    
    // After updating email, initiate verification
    try {
      // Trigger a verification email to be sent
      const verifyEmailCommand = new GetUserAttributeVerificationCodeCommand({
        AccessToken: token,
        AttributeName: 'email'
      });
      
      await cognitoClient.send(verifyEmailCommand);
      
      // If we get here without an error, the update was successful
      return {
        success: true, 
        message: 'Email updated successfully! Please check your inbox for a verification link.'
      };
    } catch (verifyError) {
      return {
        success: true, // The email was still updated
        message: 'Email updated but verification email could not be sent. Try again later.'
      };
    }
  } catch (error: any) {
    // Handle specific error cases with user-friendly messages
    if (error.name === 'InvalidParameterException') {
      return { 
        success: false, 
        message: 'Invalid email format. Please provide a valid email address.' 
      };
    }
    
    if (error.name === 'NotAuthorizedException') {
      return { 
        success: false, 
        message: 'You are not authorized to update this user\'s email. Please login again.' 
      };
    }
    
    // General error message for other cases
    return { 
      success: false, 
      message: process.env.NODE_ENV === 'production' 
        ? 'Unable to update email. Please try again later.' 
        : `Error: ${error.message}` 
    };
  }
}

// New interface for returning storage with its items
export interface StorageWithItems {
  id: string;
  name: string;
  identifier: string;
  iconName?: string;
  color?: string;
  items: StorageItem[];
}

/**
 * Fetches all items from all storage areas for the current user
 * Returns an array of storage areas, each containing their items
 */
export async function getAllStorageItems(): Promise<StorageWithItems[]> {
  try {
    // For simplicity, we use 'single-user' as our userId as indicated in the existing code
    const userId = 'single-user';
    
    // 1. Get all storage areas
    const areas = await getAreas(userId);
    
    // 2. Create an array to hold results
    const storagesWithItems: StorageWithItems[] = [];
    
    // 3. Fetch items for each storage area
    for (const area of areas) {
      // Skip areas without identifiers
      if (!area.identifier) continue;
      
      // Get items for this area
      const items = await getAreaItems(userId, area.identifier);
      
      // Add to result if there are items or we want to show empty storages too
      storagesWithItems.push({
        id: area.id,
        name: area.name,
        identifier: area.identifier,
        iconName: area.iconName,
        color: area.color,
        items: items
      });
    }
    
    return storagesWithItems;
  } catch (error) {
    return [];
  }
}
