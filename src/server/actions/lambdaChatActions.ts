'use server';

import { cookies } from 'next/headers';
import { invokeLambda } from '../../util/server-only/aws-lambda';
import { getAwsAuthHeaders } from '../../util/server-only/aws-signer';

interface ChatResponse {
  conversationId: string;
  message: string;
  done?: boolean;
}

interface StreamChunk {
  text: string;
  conversationId?: string;
  done?: boolean;
  title?: string;
}

// Lambda function names - using only the chat function now
const STAGE = process.env.APP_ENV === 'production' ? 'production' : 'dev';
const BASE_NAME = 'pantrypal-chatbot-application';

// Lambda function configurations by environment - removed unused functions
const getProdLambdaConfig = () => ({
  CHAT_LAMBDA: `${BASE_NAME}-${STAGE}-handleMessage`,
});

// Updated function names for dev environment - removed unused functions
const getDevLambdaConfig = () => ({
  CHAT_LAMBDA: 'pantrypal-chatbot-application-dev-handleMessage',
});

/**
 * Gets the appropriate Lambda function names or API paths based on environment
 */
export async function getRouteConfig() {
  // For local development
  if (process.env.APP_ENV !== 'production') {
    console.log('Using development API endpoints');
    return getDevLambdaConfig();
  }
  
  // For production
  console.log('Using production Lambda functions');
  return getProdLambdaConfig();
}

// Production routes (default)
const prodConfig = getProdLambdaConfig();

// Start with production defaults - keep only the chat function
let CHAT_LAMBDA = prodConfig.CHAT_LAMBDA;

// Initialize route config function that will be called at the start of each server action
async function initRouteConfig() {
  // Only initialize once
  if (!routesInitialized) {
    const config = await getRouteConfig();
    CHAT_LAMBDA = config.CHAT_LAMBDA;
    
    // Log which environment we're using
    console.log(`Using ${STAGE} environment for Lambda functions or routes:`, { 
      CHAT_LAMBDA
    });
    
    routesInitialized = true;
  }
}

// Track if routes have been initialized
let routesInitialized = false;

/**
 * Send a message to chat using direct Lambda invocation
 * This server action uses AWS credentials securely on the server
 */
export async function sendMessageLambda(
  message: string, 
  conversationId?: string,
): Promise<{ error?: string; isTimeout?: boolean; chunks?: StreamChunk[]; status?: number }> {
  try {
    // Initialize routes if needed
    await initRouteConfig();
    
    // Get the auth token from cookies
    const authToken = cookies().get('jwtToken')?.value;
    
    // Check if user is authenticated
    if (!authToken) {
      return {
        error: 'Authentication required. Please log in to use the chat feature.',
        status: 401
      };
    }
    
    // Get username from cookies (set by AuthProvider)
    let username = cookies().get('username')?.value || 'default';
    
    // If username is undefined, try to get it from token
    if (!username || username === 'default') {
      try {
        // Parse the JWT token
        const tokenParts = authToken.split('.');
        if (tokenParts.length === 3) {
          const tokenPayload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          
          // Try to extract username from different fields
          const extractedUsername = tokenPayload['cognito:username'] || 
                                   tokenPayload.username ||
                                   tokenPayload.preferred_username ||
                                   tokenPayload.sub; // fallback to user ID
          
          if (extractedUsername) {
            username = extractedUsername;
          }
        }
      } catch (error) {
        // Silent error - fall back to default username
      }
    }
    
    // Get AWS auth headers
    const awsHeaders = await getAwsAuthHeaders(authToken);
    
    // Prepare payload for Lambda
    const payload = {
      body: JSON.stringify({
        message,
        conversationId,
        username,
      }),
      headers: {
        'Authorization': `Bearer ${authToken}`,
        ...awsHeaders
      },
    };
    
    console.log(`Invoking Lambda function ${CHAT_LAMBDA} directly`);
    
    // Invoke Lambda function directly
    try {
      const lambdaResponse = await invokeLambda(CHAT_LAMBDA, payload);
      
      // Process Lambda response
      if (!lambdaResponse || !lambdaResponse.statusCode) {
        throw new Error('Invalid response from Lambda function');
      }
      
      if (lambdaResponse.statusCode === 401 || lambdaResponse.statusCode === 403) {
        console.error(`Lambda returned unauthorized status: ${lambdaResponse.statusCode}`);
        return {
          error: 'Your session has expired or you are not authorized. Please log in again.',
          status: lambdaResponse.statusCode
        };
      }
      
      if (lambdaResponse.statusCode !== 200) {
        throw new Error(`Chat API error: ${lambdaResponse.statusCode} - ${lambdaResponse.body || 'No error details'}`);
      }
      
      // Ensure the body is a string
      const responseBodyText = typeof lambdaResponse.body === 'string' 
        ? lambdaResponse.body
        : JSON.stringify(lambdaResponse.body);
      
      // Try parsing the response body with better error handling
      let responseBody;
      try {
        // Check if response is valid JSON
        responseBody = JSON.parse(responseBodyText);
      } catch (parseError) {
        console.error('Failed to parse Lambda response as JSON:', responseBodyText);
        // If it starts with 'd', it might be a "data:" prefix or other non-JSON content
        if (responseBodyText.startsWith('d')) {
          console.log('Response starts with "d", possibly SSE data format');
          // Try to extract JSON if response has the format "data: {...}"
          const jsonMatch = responseBodyText.match(/data: ({.*})/);
          if (jsonMatch && jsonMatch[1]) {
            try {
              responseBody = JSON.parse(jsonMatch[1]);
            } catch (e) {
              // If still can't parse, create a simple object with the message
              responseBody = {
                message: responseBodyText,
                conversationId: conversationId || 'unknown'
              };
            }
          } else {
            // Use the raw text as the message
            responseBody = {
              message: responseBodyText,
              conversationId: conversationId || 'unknown'
            };
          }
        } else {
          // For other non-JSON responses, use the raw text as the message
          responseBody = {
            message: responseBodyText,
            conversationId: conversationId || 'unknown'
          };
        }
      }
      
      // Convert the response to chunks format expected by the UI
      const chunks: StreamChunk[] = [];
      
      // If it's a streaming-style response with multiple chunks
      if (Array.isArray(responseBody)) {
        for (const item of responseBody) {
          chunks.push({
            text: item.message || '',
            conversationId: item.conversationId,
            done: item.done,
            title: item.title
          });
        }
      } else {
        // Single response
        chunks.push({
          text: responseBody.message || '',
          conversationId: responseBody.conversationId,
          done: true,
          title: responseBody.title
        });
      }
      
      return { chunks };
    } catch (error) {
      console.error('Error during Lambda invocation:', error);
      throw error;
    }
  } catch (error) {
    // Create a more descriptive error response
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in sendMessageLambda:', errorMessage);
    
    return { 
      error: errorMessage
    };
  }
} 