/**
 * Chat Configuration
 * 
 * This file configures the direct Lambda invocation.
 * For local development, the Lambda client will use serverless-offline.
 * For production, it will use actual AWS Lambda functions.
 */

export enum ChatImplementation {
  DIRECT_LAMBDA = 'DIRECT_LAMBDA'
}

/**
 * Chat implementation to use
 * Only direct Lambda invocation is supported now
 */
export const CHAT_IMPLEMENTATION: ChatImplementation = ChatImplementation.DIRECT_LAMBDA;

/**
 * Gets the Lambda chat service
 */
export function getChatService() {
  // Always use direct Lambda invocation
  return import('../util/lambdaChat');
} 