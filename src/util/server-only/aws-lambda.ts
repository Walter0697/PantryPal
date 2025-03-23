'use server';

import { Lambda } from '@aws-sdk/client-lambda';
import { InvocationType } from '@aws-sdk/client-lambda';

// Get AWS credentials from environment variables
const region = process.env.AWS_REGION || 'us-east-1';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

// Create a Lambda client
const lambdaClient = new Lambda({ 
  region,
  credentials: {
    accessKeyId: accessKeyId || '',
    secretAccessKey: secretAccessKey || ''
  }
});

/**
 * Invokes an AWS Lambda function directly from server-side code
 * @param functionName The name or ARN of the Lambda function
 * @param payload The payload to send to the Lambda function
 * @returns The Lambda function response
 */
export async function invokeLambda(functionName: string, payload: any): Promise<any> {
  try {
    // Convert payload to a proper Lambda payload
    const params = {
      FunctionName: functionName,
      Payload: Buffer.from(JSON.stringify(payload)),
      InvocationType: InvocationType.RequestResponse // Synchronous invocation
    };

    // Invoke the Lambda function
    const response = await lambdaClient.invoke(params);
    
    // Parse the response payload
    if (response.Payload) {
      const responsePayload = new TextDecoder().decode(response.Payload);
      console.log(`Lambda response from ${functionName}:`, responsePayload.substring(0, 100) + (responsePayload.length > 100 ? '...' : ''));
      
      try {
        return JSON.parse(responsePayload);
      } catch (parseError) {
        console.error(`Failed to parse Lambda response as JSON from ${functionName}:`, parseError);
        console.log('Raw response payload:', responsePayload);
        
        // Return the raw response so the caller can handle it
        return {
          statusCode: response.StatusCode || 200,
          body: responsePayload,
          rawResponse: true
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error invoking Lambda function ${functionName}:`, error);
    throw error;
  }
}

/**
 * Invokes a Lambda function asynchronously (fire and forget)
 * @param functionName The name or ARN of the Lambda function
 * @param payload The payload to send to the Lambda function
 */
export async function invokeLambdaAsync(functionName: string, payload: any): Promise<void> {
  try {
    // Convert payload to a proper Lambda payload
    const params = {
      FunctionName: functionName,
      Payload: Buffer.from(JSON.stringify(payload)),
      InvocationType: InvocationType.Event // Asynchronous invocation
    };

    // Invoke the Lambda function
    await lambdaClient.invoke(params);
    
    // No need to parse response for async invocations
  } catch (error) {
    console.error(`Error invoking Lambda function ${functionName} asynchronously:`, error);
    throw error;
  }
} 