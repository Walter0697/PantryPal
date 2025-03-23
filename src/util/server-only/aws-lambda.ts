'use server';

import { Lambda } from '@aws-sdk/client-lambda';
import { InvocationType } from '@aws-sdk/client-lambda';

// Get AWS credentials from environment variables
const region = process.env.AWS_REGION || 'us-east-1';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

// Determine if we're in local development mode
const isLocal = process.env.APP_ENV !== 'production';
const localEndpoint = 'http://localhost:3010'; // Match serverless-offline httpPort

// Create a Lambda client
const lambdaClient = new Lambda({ 
  region,
  credentials: {
    accessKeyId: accessKeyId || 'LOCAL_DEVELOPMENT_KEY',
    secretAccessKey: secretAccessKey || 'LOCAL_DEVELOPMENT_SECRET'
  },
  ...(isLocal ? { endpoint: localEndpoint } : {})
});

console.log(`Lambda client initialized for ${isLocal ? 'LOCAL development' : 'PRODUCTION'} environment (APP_ENV=${process.env.APP_ENV || 'not set'})`);

/**
 * Invokes an AWS Lambda function directly from server-side code
 * or calls a local API endpoint for development
 * @param functionNameOrPath The name/ARN of the Lambda function or API path for dev
 * @param payload The payload to send to the Lambda function or API
 * @returns The Lambda function or API response
 */
export async function invokeLambda(functionNameOrPath: string, payload: any): Promise<any> {
  try {
    // Check if this is an API path for local development (e.g., "get - /dev/conversations")
    if (isLocal && functionNameOrPath.includes(' - /')) {
      console.log(`Using local API endpoint instead of Lambda: ${functionNameOrPath}`);
      
      // Split the string to get method and path
      const [method, path] = functionNameOrPath.split(' - ');
      
      // Replace path parameters with actual values if they exist
      let finalPath = path;
      if (payload.pathParameters) {
        Object.entries(payload.pathParameters).forEach(([key, value]) => {
          finalPath = finalPath.replace(`{${key}}`, value as string);
        });
      }
      
      // Construct the full URL
      const url = `${localEndpoint}${finalPath}`;
      console.log(`Making ${method.toUpperCase()} request to: ${url}`);
      
      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...payload.headers
      };
      
      // Make the HTTP request
      const response = await fetch(url, {
        method: method.toUpperCase(),
        headers,
        body: payload.body ? JSON.stringify(JSON.parse(payload.body)) : undefined,
      });
      
      // Process the response
      const responseData = await response.json();
      
      return {
        statusCode: response.status,
        body: JSON.stringify(responseData)
      };
    } else {
      // Regular Lambda invocation
      // Convert payload to a proper Lambda payload
      const params = {
        FunctionName: functionNameOrPath,
        Payload: Buffer.from(JSON.stringify(payload)),
        InvocationType: InvocationType.RequestResponse // Synchronous invocation
      };

      // Invoke the Lambda function
      const response = await lambdaClient.invoke(params);
      
      // Parse the response payload
      if (response.Payload) {
        const responsePayload = new TextDecoder().decode(response.Payload);
        console.log(`Lambda response from ${functionNameOrPath}:`, responsePayload.substring(0, 100) + (responsePayload.length > 100 ? '...' : ''));
        
        try {
          return JSON.parse(responsePayload);
        } catch (parseError) {
          console.error(`Failed to parse Lambda response as JSON from ${functionNameOrPath}:`, parseError);
          console.log('Raw response payload:', responsePayload);
          
          // Return the raw response so the caller can handle it
          return {
            statusCode: response.StatusCode || 200,
            body: responsePayload,
            rawResponse: true
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error invoking Lambda function or API endpoint ${functionNameOrPath}:`, error);
    throw error;
  }
}

/**
 * Invokes a Lambda function asynchronously (fire and forget)
 * or calls a local API endpoint for development
 * @param functionNameOrPath The name/ARN of the Lambda function or API path
 * @param payload The payload to send
 */
export async function invokeLambdaAsync(functionNameOrPath: string, payload: any): Promise<void> {
  try {
    // Check if this is an API path for local development
    if (isLocal && functionNameOrPath.includes(' - /')) {
      console.log(`Using local API endpoint instead of Lambda (async): ${functionNameOrPath}`);
      
      // Split the string to get method and path
      const [method, path] = functionNameOrPath.split(' - ');
      
      // Replace path parameters with actual values if they exist
      let finalPath = path;
      if (payload.pathParameters) {
        Object.entries(payload.pathParameters).forEach(([key, value]) => {
          finalPath = finalPath.replace(`{${key}}`, value as string);
        });
      }
      
      // Construct the full URL
      const url = `${localEndpoint}${finalPath}`;
      
      // Make the HTTP request but don't wait for response
      fetch(url, {
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
          ...payload.headers
        },
        body: payload.body ? JSON.stringify(JSON.parse(payload.body)) : undefined,
      }).catch(err => console.error(`Async API call error: ${err}`));
      
      return;
    }
    
    // Regular Lambda async invocation
    const params = {
      FunctionName: functionNameOrPath,
      Payload: Buffer.from(JSON.stringify(payload)),
      InvocationType: InvocationType.Event // Asynchronous invocation
    };

    // Invoke the Lambda function
    await lambdaClient.invoke(params);
    
    // No need to parse response for async invocations
  } catch (error) {
    console.error(`Error invoking Lambda function or API endpoint asynchronously ${functionNameOrPath}:`, error);
    throw error;
  }
} 