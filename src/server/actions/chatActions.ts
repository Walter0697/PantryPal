'use server';

import { cookies } from 'next/headers';
import { signRequest, getAwsAuthHeaders } from '../../util/server-only/aws-signer';

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

// Base URL for the API - adjust based on environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010/dev';

// Custom fetch with timeout and AWS authentication
async function fetchWithTimeout(
  url: string, 
  options: RequestInit, 
  timeout: number = 50000,
  useAwsSigning: boolean = true
): Promise<Response> {
  const controller = new AbortController();
  const { signal } = controller;
  
  // Create the timeout
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);
  
  try {
    // Get original headers
    const originalHeaders = options.headers || {};
    
    // Add AWS authentication
    let requestHeaders = originalHeaders;
    
    if (useAwsSigning) {
      try {
        // Try signature V4 first
        const signedHeaders = await signRequest(
          url,
          options.method || 'GET',
          options.headers as Record<string, string>,
          typeof options.body === 'string' ? options.body : undefined
        );
        
        // Include both signed headers and explicit credentials
        // as the API might be configured to accept either
        const awsAuthHeaders = await getAwsAuthHeaders();
        requestHeaders = {
          ...signedHeaders,
          ...awsAuthHeaders
        };
        
        console.log('Using AWS signed request headers');
      } catch (error) {
        console.error('AWS signature failed, falling back to direct credentials:', error);
        // Fall back to direct credential headers
        const authToken = options.headers && 'Authorization' in options.headers ? 
          options.headers['Authorization'] : undefined;
        
        requestHeaders = {
          ...originalHeaders,
          ...await getAwsAuthHeaders(authToken as string)
        };
      }
    }
    
    const response = await fetch(url, {
      ...options,
      headers: requestHeaders,
      signal
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Send a message to the chat API using a server action
 * This function handles the response and returns stream data as simple objects
 */
export async function sendMessageAction(
  message: string, 
  conversationId?: string,
  // username parameter is no longer used - we extract it from cookies
): Promise<{ error?: string; isTimeout?: boolean; chunks?: StreamChunk[]; status?: number }> {
  try {
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
    
    // Prepare request body
    const requestBody = JSON.stringify({
      message,
      conversationId,
      username, // Use the username from cookies
    });
    
    // Prepare base headers
    const baseHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    };
    
    // Request URL
    const chatUrl = `${API_BASE_URL}/chat`;
    
    console.log(`Sending chat request to ${chatUrl}`);
    
    // Make API request with a longer timeout (50 seconds) and AWS authentication
    const response = await fetchWithTimeout(
      chatUrl, 
      {
        method: 'POST',
        headers: baseHeaders,
        body: requestBody,
      }, 
      50000, 
      true // Use AWS signing
    );
    
    // Handle unauthorized responses from the API
    if (response.status === 401 || response.status === 403) {
      return {
        error: 'Your session has expired or you are not authorized. Please log in again.',
        status: response.status
      };
    }
    
    if (!response.ok) {
      throw new Error(`Chat API error: ${response.status} ${response.statusText}`);
    }
    
    // Read the entire response and process it
    const chunks: StreamChunk[] = [];
    const reader = response.body?.getReader();
    
    if (!reader) {
      throw new Error("Response body is not readable");
    }
    
    const decoder = new TextDecoder();
    let fullText = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      
      // Handle server-sent events format
      if (chunk.startsWith('data: ')) {
        const jsonString = chunk.substring(6).trim(); // Remove "data: " prefix
        try {
          const jsonData = JSON.parse(jsonString);
          fullText += jsonData.message || '';
          chunks.push({
            text: chunk,
            conversationId: jsonData.conversationId,
            done: jsonData.done,
            title: jsonData.title
          });
        } catch (e) {
          // If parsing fails, just append the raw chunk
          fullText += chunk;
          chunks.push({ text: chunk });
        }
      } else {
        // Regular chunk handling
        fullText += chunk;
        chunks.push({ text: chunk });
      }
    }
    
    return { chunks };
  } catch (error) {
    // Create a more descriptive error response
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isTimeout = errorMessage.includes('timed out');
    
    return { 
      error: errorMessage,
      isTimeout: isTimeout
    };
  }
}

/**
 * Get a conversation by ID
 */
export async function getConversationAction(conversationId: string): Promise<any> {
  try {
    // Get the auth token from cookies
    const authToken = cookies().get('jwtToken')?.value;
    
    // Get username from cookies (set by AuthProvider) 
    const username = cookies().get('username')?.value;
    
    // Prepare base headers
    const baseHeaders = {
      'Authorization': `Bearer ${authToken}`
    };

    const url = `${API_BASE_URL}/conversation/${conversationId}`;
    
    console.log(`Fetching conversation with ID ${conversationId} from ${url}`);
    
    // Make request with AWS authentication
    const response = await fetchWithTimeout(
      url, 
      {
        method: 'GET',
        headers: baseHeaders,
      }, 
      30000,
      true // Use AWS signing
    );

    if (!response.ok) {
      throw new Error(`Conversation API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching conversation ${conversationId}:`, error);
    throw error;
  }
}

// Add API functions to fetch conversations and chat history

/**
 * Fetch the list of conversations for the current user
 */
export async function getConversationsAction(): Promise<{ error?: string; conversations?: any[]; status?: number }> {
  try {
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
    
    // Fetch conversations list
    let url = `${API_BASE_URL}/conversations`;
    // Add username as query parameter if available
    if (username) {
      url += `?username=${encodeURIComponent(username)}`;
    }
    
    // Prepare base headers
    const baseHeaders = {
      'Authorization': `Bearer ${authToken}`
    };
    
    console.log(`Fetching conversations from ${url}`);
    
    // Make request with AWS authentication
    const response = await fetchWithTimeout(
      url, 
      {
        method: 'GET',
        headers: baseHeaders,
      }, 
      10000,
      true // Use AWS signing
    );
    
    // Handle unauthorized responses
    if (response.status === 401 || response.status === 403) {
      return {
        error: 'Your session has expired or you are not authorized. Please log in again.',
        status: response.status
      };
    }
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Check if data is an array directly or has a conversations property
    const conversationsArray = Array.isArray(data) ? data : (data.conversations || []);
    
    return { conversations: conversationsArray };
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return { 
      error: error instanceof Error ? error.message : 'Failed to fetch conversations', 
    };
  }
}

/**
 * Fetch the chat history for a specific conversation
 */
export async function getChatHistoryAction(conversationId: string): Promise<{ error?: string; messages?: any[]; status?: number }> {
  try {
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
    
    // Fetch conversation history
    let url = `${API_BASE_URL}/conversation/${conversationId}/history`;
    // Add username as query parameter if available
    if (username) {
      url += `?username=${encodeURIComponent(username)}`;
    }
    
    // Prepare base headers
    const baseHeaders = {
      'Authorization': `Bearer ${authToken}`
    };
    
    console.log(`Fetching chat history for ${conversationId} from ${url}`);
    
    // Make request with AWS authentication
    const response = await fetchWithTimeout(
      url, 
      {
        method: 'GET',
        headers: baseHeaders,
      }, 
      10000,
      true // Use AWS signing
    );
    
    // Handle unauthorized responses
    if (response.status === 401 || response.status === 403) {
      return {
        error: 'Your session has expired or you are not authorized. Please log in again.',
        status: response.status
      };
    }
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Check if data is an array directly or has a messages property
    const messagesArray = Array.isArray(data) ? data : (data.messages || []);
    
    return { messages: messagesArray };
  } catch (error) {
    console.error(`Error fetching chat history for ${conversationId}:`, error);
    return { 
      error: error instanceof Error ? error.message : 'Failed to fetch chat history', 
    };
  }
}