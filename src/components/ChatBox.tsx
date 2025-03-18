'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FaTimes, FaPaperPlane } from 'react-icons/fa';
import { sendMessage } from '../util/chatService';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isStreaming?: boolean;
  fullContent?: string; // Store the full content while typing
}

interface ChatBoxProps {
  onClose: () => void;
}

export default function ChatBox({ onClose }: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! How can I help you with your pantry management today?',
      role: 'assistant',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [typingSpeed, setTypingSpeed] = useState(30); // Milliseconds per character
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Focus the input when chat opens
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    // Clean up any typing timers when component unmounts
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Function to simulate typing effect
  const typeMessage = (messageId: string, fullText: string) => {
    // Clear any existing typing timer
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    
    setMessages(prev => {
      const targetMessage = prev.find(msg => msg.id === messageId);
      if (!targetMessage) return prev;
      
      const currentLength = targetMessage.content.length;
      
      // If we've finished typing the full message
      if (currentLength >= fullText.length) {
        return prev.map(msg => 
          msg.id === messageId ? { ...msg, isStreaming: false } : msg
        );
      }
      
      // Add one more character
      const updatedContent = fullText.substring(0, currentLength + 1);
      
      // Schedule the next character
      typingTimerRef.current = setTimeout(() => {
        typeMessage(messageId, fullText);
      }, typingSpeed);
      
      return prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: updatedContent } 
          : msg
      );
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isLoading) return;
    
    // Check if user is authenticated - only check for token
    const hasAuth = localStorage.getItem('jwtToken');
    if (!hasAuth) {
      const errorMessage: Message = {
        id: Date.now().toString() + '1',
        content: 'Please log in to use the chat feature.',
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }
    
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      role: 'user',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    
    // Wait for a moment before showing the thinking indicator
    let responseStarted = false;
    const loadingTimeout = setTimeout(() => {
      // If no response has started yet, create a placeholder
      if (!responseStarted) {
        // Create a loading message immediately - we'll replace it later
        const loadingMessageId = Date.now().toString() + '_loading';
        setMessages(prev => [
          ...prev,
          {
            id: loadingMessageId,
            content: 'Thinking',
            role: 'assistant',
            timestamp: new Date(),
            isStreaming: true,
          }
        ]);
      }
    }, 500);

    try {
      // Create placeholder message for streaming response
      const streamingMessageId = Date.now().toString() + '1';
      
      // Use the onChunk callback to accumulate the full response
      await sendMessage(
        userMessage.content, 
        conversationId || undefined, 
        (chunk) => {
          // Response has started
          responseStarted = true;
          clearTimeout(loadingTimeout);
          
          // Check if we need to replace loading message or add a new message
          setMessages(prev => {
            // Find if there's a loading message to replace
            const loadingMsgIndex = prev.findIndex(m => 
              m.role === 'assistant' && 
              m.content === 'Thinking' && 
              m.isStreaming
            );
            
            // Create a fresh array to work with
            let updatedMessages = [...prev];
            
            // If there's a loading message, replace it with our streaming message
            if (loadingMsgIndex >= 0) {
              const newMessages = [...prev];
              newMessages[loadingMsgIndex] = {
                id: streamingMessageId,
                content: '',
                fullContent: '',
                role: 'assistant',
                timestamp: new Date(),
                isStreaming: true,
              };
              updatedMessages = newMessages;
            } else if (!prev.find(m => m.id === streamingMessageId)) {
              // If streaming message doesn't exist yet, add it
              updatedMessages = [
                ...prev,
                {
                  id: streamingMessageId,
                  content: '',
                  fullContent: '',
                  role: 'assistant',
                  timestamp: new Date(),
                  isStreaming: true,
                }
              ];
            }
            
            // Now process the chunk for the streaming message
            return updatedMessages.map(msg => {
              if (msg.id === streamingMessageId) {
                let newFullContent = '';
                
                try {
                  // Try to parse as JSON
                  const jsonData = JSON.parse(chunk);
                  // Server returns 'message' field, not 'response'
                  newFullContent = jsonData.message || '';
                  
                  // If this chunk contains a conversationId, save it
                  if (jsonData.conversationId && !conversationId) {
                    console.log('Setting conversationId from chunk:', jsonData.conversationId);
                    setConversationId(jsonData.conversationId);
                  }
                } catch (e) {
                  // Just append if not valid JSON
                  newFullContent = (msg.fullContent || '') + chunk;
                }
                
                return {
                  ...msg,
                  fullContent: newFullContent,
                };
              }
              return msg;
            });
          });
          
          // Start the typing animation
          setMessages(prev => {
            const streamingMsg = prev.find(m => m.id === streamingMessageId);
            if (streamingMsg && streamingMsg.fullContent !== streamingMsg.content) {
              // Clear previous timer
              if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
              
              // Start typing animation for this updated content
              typingTimerRef.current = setTimeout(() => {
                typeMessage(streamingMessageId, streamingMsg.fullContent || '');
              }, typingSpeed);
            }
            return prev;
          });
        }
      ).then((data) => {
        // Response completed
        clearTimeout(loadingTimeout);
        responseStarted = true;
        
        // Set conversation ID if it's a new conversation
        if (!conversationId && data.conversationId) {
          console.log('Setting conversationId from response:', data.conversationId);
          setConversationId(data.conversationId);
        }
        
        // Handle the case where no streaming started yet (very fast response)
        setMessages(prev => {
          const hasStreamingMsg = prev.find(m => m.id === streamingMessageId);
          
          if (!hasStreamingMsg) {
            // If no streaming message was created yet, add the complete message
            return [
              ...prev.filter(m => !(m.role === 'assistant' && m.content === 'Thinking' && m.isStreaming)),
              {
                id: streamingMessageId,
                content: data.message || '',
                fullContent: data.message || '',
                role: 'assistant',
                timestamp: new Date(),
                isStreaming: false,
              }
            ];
          }
          
          // Ensure the typing animation completes with the final content
          const updatedMessages = prev.map(msg => {
            if (msg.id === streamingMessageId) {
              return {
                ...msg,
                fullContent: data.message || msg.fullContent || '',
              };
            }
            return msg;
          });
          
          const streamingMsg = updatedMessages.find(m => m.id === streamingMessageId);
          if (streamingMsg && streamingMsg.fullContent !== streamingMsg.content) {
            if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
            
            typingTimerRef.current = setTimeout(() => {
              typeMessage(streamingMessageId, streamingMsg.fullContent || '');
            }, typingSpeed);
          }
          
          return updatedMessages;
        });
      });
    } catch (error) {
      console.error('Error sending message:', error);
      clearTimeout(loadingTimeout);
      
      // Update the streaming message to show the error or create new error message
      const errorMessage = 'Sorry, something went wrong. Please try again.';
      
      setMessages(prev => {
        // Check if there's already a streaming message or loading message
        const loadingMsgIndex = prev.findIndex(m => 
          m.role === 'assistant' && 
          m.content === 'Thinking' && 
          m.isStreaming
        );
        
        if (loadingMsgIndex >= 0) {
          // Replace loading message with error
          const newMessages = [...prev];
          newMessages[loadingMsgIndex] = {
            id: Date.now().toString() + '_error',
            content: errorMessage,
            role: 'assistant',
            timestamp: new Date(),
            isStreaming: false,
          };
          return newMessages;
        }
        
        // Check for streaming message
        const streamingMsg = prev.find(m => m.isStreaming && m.role === 'assistant');
        if (streamingMsg) {
          return prev.map(msg => {
            if (msg.isStreaming && msg.role === 'assistant') {
              return {
                ...msg,
                content: errorMessage,
                fullContent: errorMessage,
                isStreaming: false,
              };
            }
            return msg;
          });
        }
        
        // No existing message to update, add new error message
        return [
          ...prev,
          {
            id: Date.now().toString() + '_error',
            content: errorMessage,
            role: 'assistant',
            timestamp: new Date(),
            isStreaming: false,
          }
        ];
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg flex flex-col h-full w-full overflow-hidden">
      {/* Header */}
      <div className="bg-blue-700 text-white p-3 flex justify-between items-center">
        <h3 className="font-semibold text-lg">PantryPal Assistant</h3>
        <button 
          onClick={onClose}
          className="text-white hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-white rounded p-1"
          aria-label="Close chat"
        >
          <FaTimes />
        </button>
      </div>
      
      {/* Messages Container - Make this scrollable */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
        <div className="space-y-4">
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`mb-3 ${
                message.role === 'user'
                ? 'ml-auto bg-blue-100 text-gray-800 border border-blue-200' 
                : 'mr-auto bg-gray-200 text-gray-800 border border-gray-300' 
              } p-3 rounded-lg max-w-[85%] shadow-sm`}
            >
              {message.content === 'Thinking' ? (
                <div className="flex items-center text-gray-600 italic">
                  <span>{message.content}</span>
                  <span className="inline-block animate-dot1">.</span>
                  <span className="inline-block animate-dot2">.</span>
                  <span className="inline-block animate-dot3">.</span>
                </div>
              ) : (
                message.content
              )}
              {message.isStreaming && message.content !== 'Thinking' && (
                <span className="inline-block w-1.5 h-4 ml-1 bg-gray-700 animate-typing"></span>
              )}
            </div>
          ))}
          {isLoading && !messages.find(m => m.isStreaming) && (
            <div className="mr-auto bg-gray-200 text-gray-800 border border-gray-300 p-3 rounded-lg max-w-[85%] shadow-sm">
              <div className="flex items-center text-gray-600 italic">
                <span>Thinking</span>
                <span className="inline-block animate-dot1">.</span>
                <span className="inline-block animate-dot2">.</span>
                <span className="inline-block animate-dot3">.</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Input Form */}
      <form onSubmit={handleSubmit} className="border-t border-gray-200 p-3 flex items-center bg-white">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800 bg-white caret-blue-600"
          disabled={isLoading}
        />
        <button
          type="submit"
          className="ml-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-10 h-10 flex items-center justify-center disabled:opacity-50 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          disabled={!inputValue.trim() || isLoading}
          aria-label="Send message"
        >
          <FaPaperPlane size={16} />
        </button>
      </form>
    </div>
  );
} 