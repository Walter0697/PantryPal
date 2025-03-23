'use client';

import { 
  sendMessageAction, 
  getConversationAction, 
  getConversationsAction, 
  getChatHistoryAction 
} from '../server/actions/chatActions';

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

/**
 * Enhanced Chat Service that uses server actions for secure AWS authentication
 * This provides a drop-in replacement for the insecure chatService.ts
 */

/**
 * Send a message to the chat API using server actions for secure AWS authentication
 * @param message The message text to send
 * @param conversationId Optional conversation ID for continuing an existing conversation
 * @param onChunk Optional callback for streaming responses
 * @returns Promise with the chat response
 */
export async function sendMessage(
  message: string,
  conversationId?: string,
  onChunk?: (chunk: string | StreamChunk) => void
): Promise<ChatResponse> {
  try {
    if (conversationId) {
      console.log('Continuing conversation with ID:', conversationId);
    } else {
      console.log('Starting new conversation');
    }
    
    // Call the server action which handles AWS authentication securely
    const result = await sendMessageAction(message, conversationId);
    
    // Check for errors
    if (result.error) {
      throw new Error(result.error);
    }
    
    // Process chunks if available and callback provided
    if (result.chunks && onChunk) {
      let lastChunk: StreamChunk | undefined;
      
      for (const chunk of result.chunks) {
        onChunk(chunk);
        lastChunk = chunk;
      }
      
      // If we have a last chunk with conversation ID, return it
      if (lastChunk?.conversationId) {
        return {
          conversationId: lastChunk.conversationId,
          message: lastChunk.text || '',
          done: lastChunk.done
        };
      }
    }
    
    // Return a default response if no valid chunks
    return {
      conversationId: conversationId || '',
      message: '',
      done: true
    };
  } catch (error) {
    console.error('Error in secure chat service:', error);
    throw error;
  }
}

/**
 * Get a conversation by ID using server actions for secure AWS authentication
 * @param conversationId The conversation ID to retrieve
 * @returns Promise with the conversation data
 */
export async function getConversation(conversationId: string): Promise<any> {
  try {
    // Call the server action
    return await getConversationAction(conversationId);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    throw error;
  }
}

/**
 * Get all conversations for the current user using server actions
 * @returns Promise with the conversations data
 */
export async function getConversations(): Promise<any[]> {
  try {
    // Call the server action
    const result = await getConversationsAction();
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return result.conversations || [];
  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }
}

/**
 * Get chat history for a conversation using server actions
 * @param conversationId The conversation ID to get history for
 * @returns Promise with the chat history data
 */
export async function getChatHistory(conversationId: string): Promise<any[]> {
  try {
    // Call the server action
    const result = await getChatHistoryAction(conversationId);
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return result.messages || [];
  } catch (error) {
    console.error('Error fetching chat history:', error);
    throw error;
  }
} 