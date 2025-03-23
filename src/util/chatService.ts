// Chat API service for PantryPal
// This service handles communication with the serverless chat endpoints

interface ChatResponse {
  conversationId: string;
  message: string;  // Changed from 'response' to 'message' to match server format
  done?: boolean;   // Added 'done' flag from server response
}

// Base URL for the API - adjust based on environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010/dev';

// We cannot securely store AWS credentials on the client side
// Note: This is a temporary solution - for production, use server actions instead
const generateRequestHeaders = (authToken: string | null) => {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken || ''}`,
    // Include custom header to indicate this request should be authenticated
    // The API Gateway can be configured to recognize this header
    'x-api-client': 'pantry-pal-webapp'
  };
};

/**
 * Send a message to the chat API
 * @param message The message text to send
 * @param conversationId Optional conversation ID for continuing an existing conversation
 * @param onChunk Optional callback for streaming responses
 * @returns Promise with the chat response
 */
export async function sendMessage(
  message: string, 
  conversationId?: string,
  onChunk?: (chunk: string) => void
): Promise<ChatResponse> {
  try {
    // Log if a conversationId is being used
    if (conversationId) {
      console.log('Continuing conversation with ID:', conversationId);
    } else {
      console.log('Starting new conversation');
    }
    
    // Get auth token
    const authToken = getAuthToken();
    
    // Make API request
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: generateRequestHeaders(authToken),
      body: JSON.stringify({
        message,
        conversationId,
        userId: 'default', // Provide a default userId since it's not important
      }),
    });

    if (!response.ok) {
      throw new Error(`Chat API error: ${response.status} ${response.statusText}`);
    }

    // Check if the response is a stream and onChunk is provided
    if (response.body && onChunk) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let responseText = '';
      let responseJson: ChatResponse = { conversationId: '', message: '' };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        
        // Handle special case where the data is prefixed with "data: "
        if (chunk.startsWith('data: ')) {
          const jsonData = chunk.substring(6); // Remove "data: " prefix
          try {
            const parsedData = JSON.parse(jsonData);
            // Call the callback with the parsed data
            onChunk(JSON.stringify(parsedData));
          } catch (e) {
            // If parsing fails, just send the raw chunk
            onChunk(chunk);
          }
        } else {
          // Regular chunk handling
          responseText += chunk;
          onChunk(chunk);
        }
      }
      
      // Return the final parsed response
      try {
        if (responseText.startsWith('data: ')) {
          const jsonData = responseText.substring(6);
          return JSON.parse(jsonData);
        }
        return JSON.parse(responseText);
      } catch (e) {
        // If we can't parse as JSON, return what we have
        return {
          conversationId: conversationId || '',
          message: responseText
        };
      }
    }

    // Default non-streaming behavior
    return await response.json();
  } catch (error) {
    console.error('Error in chat service:', error);
    throw error;
  }
}

/**
 * Get a conversation by ID
 * @param conversationId The conversation ID to retrieve
 * @returns Promise with the conversation data
 */
export async function getConversation(conversationId: string): Promise<any> {
  try {
    // Get auth token
    const authToken = getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/conversation/${conversationId}`, {
      method: 'GET',
      headers: generateRequestHeaders(authToken),
    });

    if (!response.ok) {
      throw new Error(`Conversation API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching conversation:', error);
    throw error;
  }
}

/**
 * Helper function to get the auth token from localStorage
 */
function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('jwtToken');
  }
  return null;
} 