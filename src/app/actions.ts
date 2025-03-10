'use server';

import jwt from 'jsonwebtoken';
import { 
  CognitoIdentityProviderClient, 
  InitiateAuthCommand,
  AuthFlowType,
  RespondToAuthChallengeCommand,
  ChallengeNameType
} from '@aws-sdk/client-cognito-identity-provider';

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

// Log environment variables for debugging
console.log('Cognito Config Check:');
console.log(`- Client ID: "${COGNITO_CLIENT_ID}"`);
console.log(`- Client ID valid format: ${COGNITO_CLIENT_ID ? /^[\w+]+$/.test(COGNITO_CLIENT_ID) : false}`);
console.log(`- User Pool ID: "${COGNITO_USER_POOL_ID}"`);
console.log(`- AWS Region: "${AWS_REGION}"`);

// This is a server action for authentication
export async function authenticate(formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  // Simple validation
  if (!username || !password) {
    return { success: false, message: 'Username and password are required' };
  }

  try {
    // Validate configuration
    if (!COGNITO_CLIENT_ID || !COGNITO_USER_POOL_ID) {
      console.error('Cognito configuration missing or invalid');
      return { success: false, message: 'Authentication service misconfigured. Please check environment variables.' };
    }

    // Check if client ID is still a placeholder or has invalid format
    if (COGNITO_CLIENT_ID.includes('your-') || COGNITO_CLIENT_ID.includes('-') || !(/^[\w+]+$/.test(COGNITO_CLIENT_ID))) {
      console.error(`Invalid Cognito Client ID format: "${COGNITO_CLIENT_ID}". Must match pattern: [\\w+]+`);
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
    console.error('Authentication error:', error);
    
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
      console.error('Cognito configuration missing or invalid');
      return { success: false, message: 'Authentication service misconfigured. Please check environment variables.' };
    }

    console.log('Attempting password change for user:', username);
    
    // The challenge responses for the username and password
    const challengeResponses: Record<string, string> = {
      USERNAME: username,
      NEW_PASSWORD: newPassword,
    };

    // Only add email-related attributes if email parameter is provided
    if (email) {
      console.log('Email attribute being used:', email);
      
      // Approach 1: Add email as a direct challenge response attribute
      challengeResponses['email'] = email;
      
      // Approach 2: Add email as a userAttributes prefixed challenge response
      challengeResponses['userAttributes.email'] = email;
      
      // Approach 3: Add email with USER_ATTRIBUTE_PREFIX
      challengeResponses['attributes.email'] = email;
      
      // Approach 4: Add email with different format
      const userAttributesJson = JSON.stringify({ email: email });
      challengeResponses['userAttributes'] = userAttributesJson;
    } else {
      console.log('No email provided - not attempting to update email attribute');
    }

    console.log('Challenge response keys:', Object.keys(challengeResponses));

    // For Cognito, user attributes must be provided separately in the request
    const respondToAuthChallengeCommand = new RespondToAuthChallengeCommand({
      ClientId: COGNITO_CLIENT_ID,
      ChallengeName: 'NEW_PASSWORD_REQUIRED' as ChallengeNameType,
      Session: session,
      ChallengeResponses: challengeResponses,
      // Only add client metadata if email is provided
      ClientMetadata: email ? { email: email } : undefined
    });

    console.log('Sending challenge response to Cognito');

    try {
      const response = await cognitoClient.send(respondToAuthChallengeCommand);
      
      if (!response.AuthenticationResult?.IdToken) {
        console.error('No authentication result returned from Cognito');
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
      console.error('Cognito API error:', cognitoError);
      
      // Try an alternative approach with a different attribute format if there's an error about missing attributes
      if (cognitoError.message && cognitoError.message.includes('attributes given') && email) {
        console.log('Trying alternative approach for user attributes');
        
        // Copy challenge responses but without any email attributes
        const altChallengeResponses = { 
          USERNAME: username,
          NEW_PASSWORD: newPassword
        };
        
        try {
          const altCommand = new RespondToAuthChallengeCommand({
            ClientId: COGNITO_CLIENT_ID,
            ChallengeName: 'NEW_PASSWORD_REQUIRED' as ChallengeNameType,
            Session: session,
            ChallengeResponses: altChallengeResponses,
            // No client metadata
          });
          
          const altResponse = await cognitoClient.send(altCommand);
          
          if (altResponse.AuthenticationResult?.IdToken) {
            return {
              success: true,
              message: 'Password changed successfully with alternative approach!',
              token: altResponse.AuthenticationResult.IdToken,
              expiresIn: altResponse.AuthenticationResult.ExpiresIn || 3600
            };
          }
        } catch (altError: any) {
          console.error('Alternative approach failed:', altError);
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
    console.error('Password change general error:', error);
    return { 
      success: false, 
      message: process.env.NODE_ENV === 'production' 
        ? 'Failed to set new password. Please try again.' 
        : `Error: ${error.message}` 
    };
  }
}
