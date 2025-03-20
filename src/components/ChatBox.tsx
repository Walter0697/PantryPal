'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FaTimes, FaPaperPlane } from 'react-icons/fa';
import { sendMessageAction } from '../app/actions/chatActions';
import { setupTokenSync } from '../util/tokenSync';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isStreaming?: boolean;
  fullContent?: string; // Store the full content while typing
  isNew?: boolean; // Flag to identify new messages for animation
}

// Add a helper function to parse and format special content
const formatSpecialContent = (content: string): React.ReactNode => {
  // Split the content by potential special tags
  const parts: React.ReactNode[] = [];
  let currentText = '';
  let inList = false;
  let inTable = false;
  let listItems: string[] = [];
  let tableRows: string[] = [];
  
  // Process the content line by line
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Handle list opening tag
    if (line.includes('<list>')) {
      // Add any accumulated text before the list
      if (currentText) {
        // Preserve newlines in text content by splitting and joining with br tags
        const formattedText = currentText.split('\n').map((text, index) => 
          index === 0 ? text : <React.Fragment key={index}><br />{text}</React.Fragment>
        );
        parts.push(<>{formattedText}</>);
        currentText = '';
      }
      inList = true;
      // Add any content after the opening tag to the first list item
      const afterTag = line.substring(line.indexOf('<list>') + 6).trim();
      if (afterTag && afterTag.startsWith('-')) {
        listItems.push(afterTag.substring(1).trim());
      }
      continue;
    }
    
    // Handle list closing tag
    if (line.includes('</list>') && inList) {
      // Render the list
      if (listItems.length > 0) {
        parts.push(
          <ul key={`list-${parts.length}`} className="list-disc pl-8 my-4 space-y-2 bg-gray-100 p-4 rounded-lg border border-gray-300">
            {listItems.map((item: string, index: number) => (
              <li key={index} className="text-gray-800 pb-1 px-2">{item}</li>
            ))}
          </ul>
        );
      }
      
      // Reset list state
      inList = false;
      listItems = [];
      
      // Handle any content after the closing tag
      const afterTag = line.substring(line.indexOf('</list>') + 7).trim();
      if (afterTag) {
        currentText = afterTag;
      }
      continue;
    }
    
    // Add list items
    if (inList && line.startsWith('-')) {
      listItems.push(line.substring(1).trim());
      continue;
    }
    
    // Handle table opening tag
    if (line.includes('<table>')) {
      // Add any accumulated text before the table
      if (currentText) {
        // Preserve newlines in text content
        const formattedText = currentText.split('\n').map((text, index) => 
          index === 0 ? text : <React.Fragment key={index}><br />{text}</React.Fragment>
        );
        parts.push(<>{formattedText}</>);
        currentText = '';
      }
      inTable = true;
      // Add any content after the opening tag to the first table row
      const afterTag = line.substring(line.indexOf('<table>') + 7).trim();
      if (afterTag) {
        tableRows.push(afterTag);
      }
      continue;
    }
    
    // Handle table closing tag
    if (line.includes('</table>') && inTable) {
      // Render the table if we have enough rows
      if (tableRows.length >= 2) {
        try {
          // Extract header row
          const headerRow = tableRows[0];
          const headerCells = headerRow.split('|')
            .filter((cell: string) => cell.trim() !== '')
            .map((cell: string) => cell.trim());
          
          // Skip separator row and parse data rows
          const dataRows = tableRows.slice(2).map((row: string) => {
            return row.split('|')
              .filter((cell: string) => cell.trim() !== '')
              .map((cell: string) => cell.trim());
          }).filter((row: string[]) => row.length > 0);
          
          if (headerCells.length > 0) {
            parts.push(
              <div key={`table-${parts.length}`} className="overflow-x-auto my-4 rounded-lg border border-gray-300 shadow-sm">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr className="bg-blue-50 border-b border-gray-300">
                      {headerCells.map((cell: string, idx: number) => (
                        <th key={idx} className="py-3 px-6 text-left font-semibold text-gray-700">{cell}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dataRows.map((row: string[], rowIdx: number) => (
                      <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {row.map((cell: string, cellIdx: number) => (
                          <td key={cellIdx} className="py-3 px-6 border-t border-gray-200">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
        } catch (e) {
          // If table parsing fails, output the raw rows
          parts.push(<div key={`table-raw-${parts.length}`}>{tableRows.join('\n')}</div>);
        }
      }
      
      // Reset table state
      inTable = false;
      tableRows = [];
      
      // Handle any content after the closing tag
      const afterTag = line.substring(line.indexOf('</table>') + 8).trim();
      if (afterTag) {
        currentText = afterTag;
      }
      continue;
    }
    
    // Add table rows
    if (inTable) {
      tableRows.push(line);
      continue;
    }
    
    // Handle normal content
    if (!inList && !inTable) {
      currentText += (currentText ? '\n' : '') + line;
    }
  }
  
  // Add any remaining list
  if (inList && listItems.length > 0) {
    parts.push(
      <ul key={`list-${parts.length}`} className="list-disc pl-8 my-4 space-y-2 bg-gray-100 p-4 rounded-lg border border-gray-300">
        {listItems.map((item: string, index: number) => (
          <li key={index} className="text-gray-800 pb-1 px-2">{item}</li>
        ))}
      </ul>
    );
  }
  
  // Add any remaining table
  if (inTable && tableRows.length >= 2) {
    try {
      // Extract header row
      const headerRow = tableRows[0];
      const headerCells = headerRow.split('|')
        .filter((cell: string) => cell.trim() !== '')
        .map((cell: string) => cell.trim());
      
      // Skip separator row and parse data rows
      const dataRows = tableRows.slice(2).map((row: string) => {
        return row.split('|')
          .filter((cell: string) => cell.trim() !== '')
          .map((cell: string) => cell.trim());
      }).filter((row: string[]) => row.length > 0);
      
      if (headerCells.length > 0) {
        parts.push(
          <div key={`table-${parts.length}`} className="overflow-x-auto my-4 rounded-lg border border-gray-300 shadow-sm">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-blue-50 border-b border-gray-300">
                  {headerCells.map((cell: string, idx: number) => (
                    <th key={idx} className="py-3 px-6 text-left font-semibold text-gray-700">{cell}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row: string[], rowIdx: number) => (
                  <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {row.map((cell: string, cellIdx: number) => (
                      <td key={cellIdx} className="py-3 px-6 border-t border-gray-200">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
    } catch (e) {
      // If table parsing fails, output the raw rows
      parts.push(<div key={`table-raw-${parts.length}`}>{tableRows.join('\n')}</div>);
    }
  }
  
  // Add any remaining text
  if (currentText) {
    // Preserve newlines in text content
    const formattedText = currentText.split('\n').map((text, index) => 
      index === 0 ? text : <React.Fragment key={index}><br />{text}</React.Fragment>
    );
    parts.push(<>{formattedText}</>);
  }
  
  return parts.length > 0 ? <>{parts}</> : content;
};

interface ChatBoxProps {
  onClose: () => void;
}

export default function ChatBox({ onClose }: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hey there! 👋 I\'m Pantrio, your fun kitchen buddy! Ready to make your pantry sparkle? Let me help you get organized!\n\n你好！👋 我是 Pantrio，你的廚房助手。我可以幫助你整理廚房和食物儲存。',
      role: 'assistant',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [baseTypingSpeed, setBaseTypingSpeed] = useState(180); // Increased from 120 to 180ms for even slower typing
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Focus the input when chat opens
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    // Set up token synchronization for server actions
    setupTokenSync();
    
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
      
      // Get the current character and next character
      const currentChar = fullText.charAt(currentLength);
      const prevChar = currentLength > 0 ? fullText.charAt(currentLength - 1) : '';
      
      // Determine appropriate delay based on the characters
      let delay = baseTypingSpeed;
      
      // Add randomness to typing speed (±30%)
      const randomFactor = 0.7 + (Math.random() * 0.6); // random between 0.7 and 1.3
      delay = delay * randomFactor;
      
      // Word boundary (space) - add extra delay
      if (currentChar === ' ') {
        delay = baseTypingSpeed * 2.5;
      }
      
      // End of sentence - add even more delay
      if (['.', '!', '?'].includes(prevChar) && currentChar === ' ') {
        delay = baseTypingSpeed * 7;
      }
      
      // Comma, colon, semicolon - add moderate delay
      if ([',', ':', ';'].includes(prevChar)) {
        delay = baseTypingSpeed * 4;
      }
      
      // Line break - add substantial delay
      if (currentChar === '\n') {
        delay = baseTypingSpeed * 8;
      }
      
      // Occasional random "thinking" pause (7% chance, but not at the beginning)
      if (currentLength > 10 && Math.random() < 0.07) {
        delay = baseTypingSpeed * 10;
      }
      
      // Schedule the next character with the calculated delay
      typingTimerRef.current = setTimeout(() => {
        typeMessage(messageId, fullText);
      }, delay);
      
      return prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: updatedContent } 
          : msg
      );
    });
  };

  // Function to safely start typing animation
  const safelyStartTyping = (messageId: string, text: string) => {
    // Clear existing timer first
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    
    // Start new typing animation
    typeMessage(messageId, text);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isLoading) return;
    
    const token = localStorage.getItem('jwtToken');
    if (!token) {
      // User is not authenticated
      const authErrorMessage: Message = {
        id: Date.now().toString() + '_auth_required',
        content: 'You need to log in to use the chat feature.',
        role: 'assistant' as const,
        timestamp: new Date(),
        isNew: true,
      };
      setMessages(prev => [...prev, authErrorMessage]);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      role: 'user',
      timestamp: new Date(),
      isNew: true,
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    
    // Remove all "Thinking" indicator code - we'll just wait for the actual response
    let responseStarted = false;

    try {
      // Create placeholder message for streaming response
      const streamingMessageId = Date.now().toString() + '1';
      
      // Call the server action instead of the chatService
      const result = await sendMessageAction(userMessage.content, conversationId || undefined);
      
      // Check for errors
      if (result.error) {
        // Handle authentication errors
        if (result.status === 401 || result.status === 403) {
          // Clear local token as it may be invalid or expired
          localStorage.removeItem('jwtToken');
          
          const errorMessage: Message = {
            id: Date.now().toString() + '_auth_error',
            content: result.error,
            role: 'assistant' as const,
            timestamp: new Date(),
            isNew: true,
          };
          setMessages(prev => [...prev, errorMessage]);
          return;
        }
        
        // Handle timeout specifically
        if (result.isTimeout) {
          throw new Error(`Request timed out: ${result.error}`);
        }
        throw new Error(result.error);
      }
      
      // If we have chunks, process them
      if (result.chunks && result.chunks.length > 0) {
        // Add a new streaming message on first chunk
        const newMessage: Message = {
          id: streamingMessageId,
          content: '', // Start with empty content that will be "typed out"
          fullContent: '', // This will hold the entire message
          role: 'assistant',
          timestamp: new Date(),
          isStreaming: true,
          isNew: true,
        };
        
        setMessages(prev => [...prev, newMessage]);
        
        // Process all chunks
        let responseText = '';
        
        // Process all chunks we received from the server action
        for (const chunk of result.chunks) {
          responseStarted = true;
          
          // Try to parse JSON if needed
          if (chunk.text.startsWith('data: ')) {
            try {
              const jsonString = chunk.text.substring(6).trim();
              const jsonData = JSON.parse(jsonString);
              responseText = jsonData.message || '';
              
              // If this chunk contains a conversationId, save it
              if (jsonData.conversationId && !conversationId) {
                setConversationId(jsonData.conversationId);
              }
            } catch (e) {
              // If parsing fails, just append the raw chunk
              responseText += chunk.text;
            }
          } else {
            // Regular chunk handling
            responseText += chunk.text;
          }
          
          // Update the message with the new content after processing each chunk
          setMessages(prev => {
            return prev.map(msg => {
              if (msg.id === streamingMessageId) {
                return {
                  ...msg,
                  fullContent: responseText,
                  isNew: true,
                }
              }
              return msg;
            });
          });
        }
        
        // Start the typing animation with the final text
        setTimeout(() => {
          setMessages(prev => {
            const streamingMsg = prev.find(m => m.id === streamingMessageId);
            if (streamingMsg && streamingMsg.fullContent !== streamingMsg.content) {
              safelyStartTyping(streamingMessageId, streamingMsg.fullContent || '');
            }
            return prev;
          });
        }, 100);
        
      } else {
        // Handle case where we got a response but no chunks
        const errorMessage = 'Received empty response from server';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Try to extract error details if it's in JSON format (from our custom Response)
      let errorMessage = 'Sorry, something went wrong. Please try again.';
      let isTimeout = false;
      
      if (error instanceof Error) {
        // Check if it's a timeout error
        isTimeout = error.message.includes('timed out') || error.message.includes('timeout');
        
        if (isTimeout) {
          errorMessage = 'The request timed out. Your message might be too complex or our servers are busy. Please try a shorter message or try again later.';
        } else if (error.message.includes('Chat API error')) {
          // If it's an API error, try to parse the response
          try {
            // Extract status code if available
            const statusMatch = error.message.match(/(\d{3})/);
            if (statusMatch && statusMatch[1] === '504') {
              isTimeout = true;
              errorMessage = 'The request timed out. Your message might be too complex or our servers are busy. Please try a shorter message or try again later.';
            }
          } catch (e) {
            // Use default error message
          }
        }
      }
      
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString() + '_error',
          content: errorMessage,
          role: 'assistant' as const,
          timestamp: new Date(),
          isStreaming: false,
          isNew: true,
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Remove isNew flag after animation completes
  useEffect(() => {
    const animationTimeout = setTimeout(() => {
      setMessages(prevMessages => 
        prevMessages.map(msg => msg.isNew ? { ...msg, isNew: false } : msg)
      );
    }, 1000); // Match this with the animation duration

    return () => clearTimeout(animationTimeout);
  }, [messages]);

  return (
    <div className="bg-white rounded-lg shadow-lg flex flex-col h-[90vh] max-h-[90vh] w-full overflow-hidden">
      {/* Header - Make entire header clickable */}
      <div 
        className="bg-blue-700 text-white p-3 flex justify-between items-center cursor-pointer"
        onClick={onClose}
      >
        <h3 className="font-semibold text-lg">Pantrio</h3>
        <button 
          onClick={(e) => {
            e.stopPropagation(); // Prevent triggering parent onClick
            onClose();
          }}
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
                ? 'ml-auto bg-blue-100 text-gray-800 border border-blue-200 relative' 
                : 'mr-auto bg-gray-200 text-gray-800 border border-gray-300 relative' 
              } p-3 rounded-lg max-w-[85%] shadow-sm ${
                message.isNew ? 'animate-fadeIn' : ''
              }`}
            >
              {message.role === 'assistant' && (
                <div className="absolute left-[-6px] bottom-[3px] w-3 h-3 bg-gray-200 border-l border-b border-gray-300 transform rotate-45 skew-y-[10deg]"></div>
              )}
              {message.role === 'user' && (
                <div className="absolute right-[-6px] bottom-[3px] w-3 h-3 bg-blue-100 border-r border-b border-blue-200 transform rotate-[-45deg] skew-y-[10deg]"></div>
              )}
              {message.role === 'assistant' && typeof message.content === 'string' ? (
                <>
                  {formatSpecialContent(message.content)}
                  {message.isStreaming && (
                    <span className="inline-block w-1.5 h-4 ml-1 bg-gray-700 animate-typing"></span>
                  )}
                </>
              ) : (
                <>
                  {message.content}
                  {message.isStreaming && (
                    <span className="inline-block w-1.5 h-4 ml-1 bg-gray-700 animate-typing"></span>
                  )}
                </>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Input Form */}
      <form onSubmit={handleSubmit} className="border-t border-gray-200 p-3 flex flex-col bg-white">
        {/* Thinking indicator - show only when loading and no response started yet */}
        {isLoading && !messages.some(m => m.isStreaming) && (
          <div className="text-gray-600 text-xs mb-2 w-full py-2 px-3 bg-gray-200 rounded flex items-center justify-start shadow-sm">
            <span className="italic">Pantrio is thinking</span>
            <span className="inline-block animate-dot1 mx-[1px]">.</span>
            <span className="inline-block animate-dot2 mx-[1px]">.</span>
            <span className="inline-block animate-dot3 mx-[1px]">.</span>
          </div>
        )}
        <div className="flex items-center">
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
        </div>
      </form>
    </div>
  );
}

// Add this CSS at the bottom of the file
const styles = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fadeIn {
  animation: fadeIn 0.5s ease-out forwards;
}

@keyframes typing {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.animate-typing {
  animation: typing 1s infinite;
}

@keyframes dot1 {
  0%, 100% { opacity: 0; }
  25%, 50% { opacity: 1; }
}

@keyframes dot2 {
  0%, 25%, 100% { opacity: 0; }
  50%, 75% { opacity: 1; }
}

@keyframes dot3 {
  0%, 50%, 100% { opacity: 0; }
  75%, 95% { opacity: 1; }
}

.animate-dot1 { animation: dot1 1.3s infinite; }
.animate-dot2 { animation: dot2 1.3s infinite; }
.animate-dot3 { animation: dot3 1.3s infinite; }
`;

// Add the styles to the document
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.innerHTML = styles;
  document.head.appendChild(styleElement);
} 