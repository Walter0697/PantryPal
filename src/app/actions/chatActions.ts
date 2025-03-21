'use server';

import { cookies } from 'next/headers';

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

// Custom fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeout: number = 50000): Promise<Response> {
  const controller = new AbortController();
  const { signal } = controller;
  
  // Create the timeout
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
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
  conversationId?: string
): Promise<{ error?: string; isTimeout?: boolean; chunks?: StreamChunk[]; status?: number }> {
  try {
    // Get the auth token from cookies instead of localStorage
    const authToken = cookies().get('jwtToken')?.value;
    
    // Check if user is authenticated
    if (!authToken) {
      return {
        error: 'Authentication required. Please log in to use the chat feature.',
        status: 401
      };
    }
    
    // Make API request with a longer timeout (50 seconds)
    const response = await fetchWithTimeout(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        message,
        conversationId,
        userId: 'default', // Provide a default userId since it's not important
      }),
    }, 50000); // 50 second timeout
    
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
    console.error('Error in chat server action:', error);
    
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
    
    const response = await fetchWithTimeout(`${API_BASE_URL}/conversation/${conversationId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
    }, 30000); // 30 second timeout for conversation retrieval

    if (!response.ok) {
      throw new Error(`Conversation API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching conversation:', error);
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
    
    // Fetch conversations list
    const response = await fetchWithTimeout(`${API_BASE_URL}/conversations`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
    }, 10000); // 10 second timeout
    
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
    
    // Fetch conversation history
    const response = await fetchWithTimeout(`${API_BASE_URL}/conversation/${conversationId}/history`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
    }, 10000); // 10 second timeout
    
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
    console.error('Error fetching chat history:', error);
    return { 
      error: error instanceof Error ? error.message : 'Failed to fetch chat history', 
    };
  }
} 