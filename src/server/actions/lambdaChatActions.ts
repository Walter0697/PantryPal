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

// Lambda function names - dynamically set based on environment
const STAGE = process.env.APP_ENV === 'production' ? 'production' : 'dev';
const BASE_NAME = 'pantrypal-chatbot-application';

// Lambda function configurations by environment
const getProdLambdaConfig = () => ({
  CHAT_LAMBDA: `${BASE_NAME}-${STAGE}-handleMessage`,
  CONVERSATION_LAMBDA: `${BASE_NAME}-${STAGE}-getConversation`,
  CONVERSATIONS_LAMBDA: `${BASE_NAME}-${STAGE}-listConversations`,
  HISTORY_LAMBDA: `${BASE_NAME}-${STAGE}-getChatHistory`
});

const getDevLambdaConfig = () => ({
  CHAT_LAMBDA: 'post - /dev/chat',
  CONVERSATION_LAMBDA: 'get - /dev/conversation/{id}',
  CONVERSATIONS_LAMBDA: 'get - /dev/conversations',
  HISTORY_LAMBDA: 'get - /dev/conversation/{id}/history'
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

// Start with production defaults
let CHAT_LAMBDA = prodConfig.CHAT_LAMBDA;
let CONVERSATION_LAMBDA = prodConfig.CONVERSATION_LAMBDA;
let CONVERSATIONS_LAMBDA = prodConfig.CONVERSATIONS_LAMBDA;
let HISTORY_LAMBDA = prodConfig.HISTORY_LAMBDA;

// Initialize route config function that will be called at the start of each server action
async function initRouteConfig() {
  // Only initialize once
  if (!routesInitialized) {
    const config = await getRouteConfig();
    CHAT_LAMBDA = config.CHAT_LAMBDA;
    CONVERSATION_LAMBDA = config.CONVERSATION_LAMBDA;
    CONVERSATIONS_LAMBDA = config.CONVERSATIONS_LAMBDA;
    HISTORY_LAMBDA = config.HISTORY_LAMBDA;
    
    // Log which environment we're using
    console.log(`Using ${STAGE} environment for Lambda functions or routes:`, { 
      CHAT_LAMBDA, CONVERSATION_LAMBDA, CONVERSATIONS_LAMBDA, HISTORY_LAMBDA 
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
            text: `data: ${JSON.stringify(item)}`,
            conversationId: item.conversationId,
            done: item.done,
            title: item.title
          });
        }
      } else {
        // Single response
        chunks.push({
          text: `data: ${JSON.stringify(responseBody)}`,
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

/**
 * Get a conversation by ID using direct Lambda invocation
 */
export async function getConversationLambda(conversationId: string): Promise<any> {
  try {
    // Initialize routes if needed
    await initRouteConfig();
    
    // Get the auth token from cookies
    const authToken = cookies().get('jwtToken')?.value;
    
    // Get AWS auth headers
    const awsHeaders = await getAwsAuthHeaders(authToken);
    
    // Prepare payload for Lambda
    const payload = {
      pathParameters: {
        id: conversationId
      },
      headers: {
        'Authorization': `Bearer ${authToken}`,
        ...awsHeaders
      }
    };
    
    console.log(`Invoking Lambda function ${CONVERSATION_LAMBDA} directly for conversation ${conversationId}`);
    
    // Invoke Lambda function directly
    const lambdaResponse = await invokeLambda(CONVERSATION_LAMBDA, payload);
    
    if (!lambdaResponse || !lambdaResponse.statusCode) {
      throw new Error('Invalid response from Lambda function');
    }
    
    if (lambdaResponse.statusCode === 401 || lambdaResponse.statusCode === 403) {
      console.error(`Lambda returned unauthorized status: ${lambdaResponse.statusCode}`);
      throw new Error('Your session has expired or you are not authorized. Please log in again.');
    }
    
    if (lambdaResponse.statusCode !== 200) {
      throw new Error(`Conversation API error: ${lambdaResponse.statusCode}`);
    }
    
    // Ensure the body is a string
    const responseBodyText = typeof lambdaResponse.body === 'string' 
      ? lambdaResponse.body
      : JSON.stringify(lambdaResponse.body);
    
    // Parse the response body
    return JSON.parse(responseBodyText);
  } catch (error) {
    console.error(`Error in getConversationLambda for ${conversationId}:`, error);
    throw error;
  }
}

/**
 * Fetch the list of conversations for the current user using direct Lambda invocation
 */
export async function getConversationsLambda(): Promise<{ error?: string; conversations?: any[]; status?: number }> {
  try {
    // Initialize routes if needed
    await initRouteConfig();
    
    // Get the auth token from cookies
    const authToken = cookies().get('jwtToken')?.value;
    
    // Check if user is authenticated
    if (!authToken) {
      return {
        error: 'Authentication required. Please log in to view conversations.',
        status: 401
      };
    }
    
    // Get username from cookies (set by AuthProvider)
    const username = cookies().get('username')?.value;
    
    // Get AWS auth headers
    const awsHeaders = await getAwsAuthHeaders(authToken);
    
    // Prepare payload for Lambda
    const payload = {
      queryStringParameters: username ? { username } : undefined,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        ...awsHeaders
      }
    };
    
    console.log(`Invoking Lambda function ${CONVERSATIONS_LAMBDA} directly for username ${username || 'unknown'}`);
    
    // Invoke Lambda function directly
    const lambdaResponse = await invokeLambda(CONVERSATIONS_LAMBDA, payload);
    
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
      throw new Error(`API error: ${lambdaResponse.statusCode}`);
    }
    
    // Ensure the body is a string
    const responseBodyText = typeof lambdaResponse.body === 'string' 
      ? lambdaResponse.body
      : JSON.stringify(lambdaResponse.body);
    
    // Parse the response body
    const data = JSON.parse(responseBodyText);
    
    // Check if data is an array directly or has a conversations property
    const conversationsArray = Array.isArray(data) ? data : (data.conversations || []);
    
    return { conversations: conversationsArray };
  } catch (error) {
    console.error('Error in getConversationsLambda:', error);
    return { 
      error: error instanceof Error ? error.message : 'Failed to fetch conversations'
    };
  }
}

/**
 * Fetch the chat history for a specific conversation using direct Lambda invocation
 */
export async function getChatHistoryLambda(conversationId: string): Promise<{ error?: string; messages?: any[]; status?: number }> {
  try {
    // Initialize routes if needed
    await initRouteConfig();
    
    // Get the auth token from cookies
    const authToken = cookies().get('jwtToken')?.value;
    
    // Check if user is authenticated
    if (!authToken) {
      return {
        error: 'Authentication required. Please log in to view chat history.',
        status: 401
      };
    }
    
    // Get username from cookies (set by AuthProvider)
    const username = cookies().get('username')?.value;
    
    // Get AWS auth headers
    const awsHeaders = await getAwsAuthHeaders(authToken);
    
    // Prepare payload for Lambda
    const payload = {
      pathParameters: {
        id: conversationId,
        resource: 'history'
      },
      queryStringParameters: username ? { username } : undefined,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        ...awsHeaders
      }
    };
    
    console.log(`Invoking Lambda function ${HISTORY_LAMBDA} directly for conversation ${conversationId}`);
    
    // Invoke Lambda function directly
    const lambdaResponse = await invokeLambda(HISTORY_LAMBDA, payload);
    
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
      throw new Error(`API error: ${lambdaResponse.statusCode}`);
    }
    
    // Ensure the body is a string
    const responseBodyText = typeof lambdaResponse.body === 'string' 
      ? lambdaResponse.body
      : JSON.stringify(lambdaResponse.body);
    
    // Parse the response body
    const data = JSON.parse(responseBodyText);
    
    // Check if data is an array directly or has a messages property
    const messagesArray = Array.isArray(data) ? data : (data.messages || []);
    
    return { messages: messagesArray };
  } catch (error) {
    console.error(`Error in getChatHistoryLambda for ${conversationId}:`, error);
    return { 
      error: error instanceof Error ? error.message : 'Failed to fetch chat history'
    };
  }
} 