'use server';

import { cookies } from 'next/headers';
import { 
  scanItems, 
  getItem,
  getTableName
} from '../../util/server-only/dynamodb';

// Table names
const CHAT_TABLE = 'chat';

interface Conversation {
  id: string;
  title: string;
  username: string;
  createdAt: string;
  updatedAt: string;
  messages: any[];
}

/**
 * Server action to fetch conversations from the database directly
 * This bypasses the Lambda function and connects directly to DynamoDB
 */
export async function getConversationsFromDB(): Promise<{ error?: string; conversations?: any[]; status?: number }> {
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
    
    // Get username from cookies
    const username = cookies().get('username')?.value;
    
    if (!username) {
      return {
        error: 'Username not found in session. Please log in again.',
        status: 400
      };
    }
    
    // Get conversations from database using dynamodb utility
    const items = await scanItems<Conversation>(
      CHAT_TABLE,
      'username = :username',
      { ':username': username }
    );
    
    // Sort by createdAt or updatedAt (newest first)
    const sortedItems = [...items].sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt).getTime();
      return dateB - dateA;
    });
    
    // Format the conversations
    const formattedConversations = sortedItems.map(item => ({
      id: item.id,
      title: item.title || `Conversation ${item.id.substring(0, 8)}`,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt || item.createdAt,
      messageCount: Array.isArray(item.messages) ? item.messages.length : 0
    }));
    
    return { conversations: formattedConversations };
  } catch (error) {
    console.error('Error in getConversationsFromDB:', error);
    return { 
      error: error instanceof Error ? error.message : 'Failed to fetch conversations from database',
      status: 500
    };
  }
}

/**
 * Server action to fetch a specific conversation from the database
 */
export async function getConversationFromDB(conversationId: string): Promise<any> {
  try {
    // Get the auth token from cookies
    const authToken = cookies().get('jwtToken')?.value;
    
    // Check if user is authenticated
    if (!authToken) {
      return {
        error: 'Authentication required. Please log in to view this conversation.',
        status: 401
      };
    }
    
    // Get conversation from database using dynamodb utility
    const conversation = await getItem<Conversation>(CHAT_TABLE, { id: conversationId });
    
    if (!conversation) {
      return {
        error: `Conversation with ID ${conversationId} not found`,
        status: 404
      };
    }
    
    return conversation;
  } catch (error) {
    console.error(`Error in getConversationFromDB for ${conversationId}:`, error);
    return { 
      error: error instanceof Error ? error.message : 'Failed to fetch conversation from database',
      status: 500
    };
  }
}

/**
 * Server action to fetch messages for a specific conversation from the database
 */
export async function getChatHistoryFromDB(conversationId: string): Promise<{ error?: string; messages?: any[]; status?: number }> {
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
    
    // Get conversation from database using dynamodb utility
    const conversation = await getItem<Conversation>(CHAT_TABLE, { id: conversationId });
    
    if (!conversation) {
      return {
        error: `Conversation with ID ${conversationId} not found`,
        status: 404
      };
    }
    
    if (!Array.isArray(conversation.messages)) {
      return { messages: [] };
    }
    
    // Format the messages for the UI
    const formattedMessages = conversation.messages.map((msg: any, index: number) => ({
      id: msg.id || `${conversationId}-msg-${index}`,
      content: msg.content || msg.message || '',
      role: msg.role || (msg.isUser ? 'user' : 'assistant'),
      timestamp: msg.timestamp || msg.createdAt || conversation.createdAt
    }));
    
    return { messages: formattedMessages };
  } catch (error) {
    console.error(`Error in getChatHistoryFromDB for ${conversationId}:`, error);
    return { 
      error: error instanceof Error ? error.message : 'Failed to fetch chat history from database',
      status: 500
    };
  }
} 