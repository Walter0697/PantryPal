/**
 * Chat Configuration
 * 
 * This file configures the chat implementation to use:
 * - Direct Lambda invocation: Uses AWS Lambda functions for chat operations
 * - Direct Database: Uses direct DynamoDB access for chat operations
 * 
 * For local development in Lambda mode, the Lambda client will use serverless-offline.
 * For production, it will use actual AWS Lambda functions.
 */

export enum ChatImplementation {
  DIRECT_LAMBDA = 'DIRECT_LAMBDA',
  DIRECT_DB = 'DIRECT_DB'
}

/**
 * Chat implementation to use
 * DIRECT_DB is recommended for better performance and reliability
 */
export const CHAT_IMPLEMENTATION: ChatImplementation = ChatImplementation.DIRECT_DB;

/**
 * Gets the chat service based on implementation
 */
export function getChatService() {
  if (CHAT_IMPLEMENTATION === ChatImplementation.DIRECT_LAMBDA) {
    return import('../util/lambdaChat');
  } else {
    // For direct DB implementation, there's no service to import
    // Components will use the dbChatActions directly
    return null;
  }
} 