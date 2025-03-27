'use server';

import { SignatureV4 } from '@aws-sdk/signature-v4';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { HttpRequest } from '@aws-sdk/protocol-http';
import { Sha256 } from '@aws-crypto/sha256-js';
import { URL } from 'url';

// Get AWS credentials from environment variables
const region = process.env.AWS_REGION || 'us-east-1';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

// Create a credential provider that uses environment variables
const credentials = {
  accessKeyId: accessKeyId || '',
  secretAccessKey: secretAccessKey || ''
};

// Log credentials (without revealing full secret)
console.log(`AWS Credentials configured: region=${region}, accessKeyId=${accessKeyId?.substring(0, 5)}...`);

/**
 * Signs an HTTP request with AWS Signature V4
 * @param url The full URL for the request
 * @param method The HTTP method (GET, POST, etc.)
 * @param headers Headers to include in the request
 * @param body Optional request body for POST/PUT requests
 * @returns Signed request headers
 */
export async function signRequest(
  url: string,
  method: string,
  headers: Record<string, string> = {},
  body?: string
): Promise<Record<string, string>> {
  try {
    // Parse the URL to get components
    const parsedUrl = new URL(url);
    
    // Create the HTTP request object
    const request = new HttpRequest({
      method,
      headers: {
        'host': parsedUrl.host,
        ...headers
      },
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      body
    });

    // Create the signer
    const signer = new SignatureV4({
      credentials,
      region,
      service: 'execute-api', // Use 'execute-api' for API Gateway
      sha256: Sha256
    });

    // Sign the request
    const signedRequest = await signer.sign(request);
    
    // Log signing process (for debugging)
    console.log(`Request signed for ${method} ${url}`);
    
    // Return the signed headers
    return signedRequest.headers as Record<string, string>;
  } catch (error) {
    console.error('Error signing AWS request:', error);
    // Return the original headers if signing fails
    return headers;
  }
}

/**
 * Creates complete AWS authentication headers 
 * This is a simpler approach that directly provides the needed credentials
 * @param authToken Optional JWT token to include
 * @returns Headers with AWS credentials
 */
export async function getAwsAuthHeaders(authToken?: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'x-api-key': accessKeyId || '',
    'x-api-secret': secretAccessKey || ''
  };
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  return headers;
} 