/**
 * Chat Configuration
 * 
 * This file configures which chat implementation to use:
 * 
 * 1. API_GATEWAY: Uses API Gateway with AWS Signature V4 (server-side)
 * 2. DIRECT_LAMBDA: Calls Lambda functions directly (server-side)
 * 3. CLIENT_API: Client-side API calls (least secure, only for testing)
 */

export enum ChatImplementation {
  API_GATEWAY = 'API_GATEWAY',
  DIRECT_LAMBDA = 'DIRECT_LAMBDA',
  CLIENT_API = 'CLIENT_API'
}

/**
 * AWS Lambda function configuration
 * Update these to match your actual Lambda function names
 */
export const lambdaConfig = {
  chatFunction: 'pantrypal-chat-function',
  conversationFunction: 'pantrypal-conversation-function', 
  conversationsFunction: 'pantrypal-conversations-function',
  historyFunction: 'pantrypal-history-function'
};

/**
 * Chat implementation to use
 * Change this to select which implementation to use
 */
export const CHAT_IMPLEMENTATION: ChatImplementation = ChatImplementation.DIRECT_LAMBDA;

/**
 * Gets the appropriate chat service based on the selected implementation
 */
export function getChatService() {
  switch (CHAT_IMPLEMENTATION) {
    case ChatImplementation.API_GATEWAY:
      // Use the server actions with AWS Signature V4
      return import('../util/secureChat');
      
    case ChatImplementation.DIRECT_LAMBDA:
      // Use the direct Lambda invocation (server-side)
      return import('../util/lambdaChat');
      
    case ChatImplementation.CLIENT_API:
      // Use the original client-side chat service (least secure)
      return import('../util/chatService');
      
    default:
      // Default to direct Lambda - most secure option
      return import('../util/lambdaChat');
  }
} 