'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FaTimes, FaRegLightbulb, FaPaperPlane, FaSpinner, FaArrowDown, FaBars } from 'react-icons/fa';
import { useRouter } from 'next/navigation';

// Import only the direct Lambda methods
import { sendMessageLambda } from '../server/actions/lambdaChatActions';

// Import the direct database methods
import { getConversationsFromDB, getChatHistoryFromDB } from '../server/actions/dbChatActions';

// Default conversation title
const DEFAULT_CHAT_TITLE = 'New Chat';

// Welcome message variants
const WELCOME_MESSAGES = [
  'Hey there! 👋 I\'m Pantrio, your fun kitchen buddy! Ready to make your pantry sparkle? Let me help you get organized!\n\n你好！👋 我是 Pantrio，你的廚房助手。我可以幫助你整理廚房和食物儲存。',
  'Welcome to Pantrio! 🍽️ I\'m here to help with all things kitchen-related. Need recipe ideas, pantry organization tips, or meal planning? Just ask!\n\n歡迎使用 Pantrio！🍽️ 我在這裡幫助您處理所有與廚房相關的事情。需要食譜創意、儲藏室整理技巧或餐點計劃？儘管問！',
  'Hi there! 🥗 I\'m your Pantrio assistant. I can help you organize your ingredients, find recipes, and make the most of your kitchen. What can I help with today?\n\n嗨！🥗 我是您的 Pantrio 助手。我可以幫助您整理食材、尋找食譜，並充分利用您的廚房。今天我能幫您做什麼？',
  'Greetings! 🧁 I\'m Pantrio, your kitchen management assistant. From organizing your pantry to suggesting recipes based on what you have - I\'m here to help. What would you like to do today?\n\n您好！🧁 我是 Pantrio，您的廚房管理助手。無論是整理儲藏室還是根據您現有的食材建議食譜 - 我都能幫忙。今天您想做什麼？'
];

// Helper function to get a random welcome message
const getRandomWelcomeMessage = (): string => {
  const randomIndex = Math.floor(Math.random() * WELCOME_MESSAGES.length);
  return WELCOME_MESSAGES[randomIndex];
};

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  isNew?: boolean;
  isStreaming?: boolean;
  fullContent?: string; // Store the full content while typing
  title?: string;
}

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
}

// Add a helper function to format dates
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  // Less than 24 hours ago
  if (diff < 24 * 60 * 60 * 1000) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // Less than 7 days ago
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const options: Intl.DateTimeFormatOptions = { weekday: 'short' };
    return date.toLocaleDateString([], options);
  }
  
  // Older
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

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

interface Props {
  onClose?: () => void;
  initialConversationId?: string | null;
  initialConversationTitle?: string;
  isFullScreen?: boolean;
}

export default function ChatBox({ onClose, initialConversationId, initialConversationTitle, isFullScreen = false }: Props) {
  const [messages, setMessages] = useState<Message[]>([{
    id: '1',
    content: getRandomWelcomeMessage(),
    role: 'assistant',
    timestamp: new Date(),
    title: DEFAULT_CHAT_TITLE
  }]);
  
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId || null);
  const [baseTypingSpeed, setBaseTypingSpeed] = useState(180); // Increased from 120 to 180ms for even slower typing
  const [conversationTitle, setConversationTitle] = useState<string>(initialConversationTitle || DEFAULT_CHAT_TITLE);
  const [isTitleNew, setIsTitleNew] = useState(false);
  const [isConversationMenuOpen, setIsConversationMenuOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [hasConversationStarted, setHasConversationStarted] = useState(false);
  const [conversationsError, setConversationsError] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [preventAutoSelect, setPreventAutoSelect] = useState(true);
  const [userScrolled, setUserScrolled] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const conversationMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const messageContainerRef = useRef<HTMLDivElement>(null);

  // Function to fetch conversations
  const fetchConversations = async () => {
    setIsLoadingConversations(true);
    
    try {
      // Use the direct database method instead of Lambda
      const result = await getConversationsFromDB();
      
      if (result.error) {
        if (result.status === 401 || result.status === 403) {
          // Token is invalid or expired
          setShowLoginModal(true);
          return;
        }
        
        throw new Error(result.error);
      }
      
      // Sort conversations by updatedAt (most recent first)
      const sortedConversations = [...(result.conversations || [])].sort((a, b) => {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
      
      setConversations(sortedConversations);
      
      // Only auto-select if explicitly told to do so (for example, with initialConversationId)
      if (initialConversationId && sortedConversations.length > 0 && !preventAutoSelect) {
        handleSelectConversation(sortedConversations[0].id);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setConversationsError('Failed to load conversations. Please try again later.');
    } finally {
      setIsLoadingConversations(false);
    }
  };

  // Update title with animation trigger
  const updateTitle = (newTitle: string) => {
    setConversationTitle(newTitle);
    setIsTitleNew(true);
  };

  // Function to load chat history
  const loadChatHistory = async (conversationId: string) => {
    if (!conversationId) return;
    
    setIsLoadingMessages(true);
    setMessages([]); // Clear messages while loading
    
    try {
      // Use the direct database method instead of Lambda
      const result = await getChatHistoryFromDB(conversationId);
      
      if (result.error) {
        if (result.status === 401 || result.status === 403) {
          // Token is invalid or expired
          setShowLoginModal(true);
          return;
        }
        
        throw new Error(result.error);
      }
      
      // Find the conversation to set the title
      const conversation = conversations.find(c => c.id === conversationId);
      if (conversation) {
        setConversationTitle(conversation.title);
      }
      
      // Format messages for the UI
      const formattedMessages = (result.messages || []).map((msg: any) => ({
        id: msg.id || msg.messageId || Date.now().toString() + Math.random().toString(),
        content: msg.content || msg.message || '',
        role: msg.role || (msg.isUser ? 'user' : 'assistant'),
        timestamp: new Date(msg.timestamp || msg.createdAt || Date.now()),
      }));
      
      // Sort by timestamp if available
      const sortedMessages = formattedMessages.sort((a: any, b: any) => {
        return a.timestamp.getTime() - b.timestamp.getTime();
      });
      
      // Set conversation ID explicitly to ensure buttons are enabled
      setConversationId(conversationId);
      
      // This is an existing conversation, so set hasConversationStarted to true
      setHasConversationStarted(true);
      
      setMessages(sortedMessages);
    } catch (error) {
      console.error('Error loading chat history:', error);
      setMessages([{
        id: 'error',
        content: 'Failed to load chat history. Please try again later.',
        role: 'assistant',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Add a function to reset the conversation
  const resetConversation = () => {
    setConversationId(null);
    updateTitle(DEFAULT_CHAT_TITLE);
    // Clear the messages array and set the default welcome message
    setMessages([{
      id: '1',
      content: getRandomWelcomeMessage(),
      role: 'assistant',
      timestamp: new Date(),
      title: DEFAULT_CHAT_TITLE
    }]);
    setHasConversationStarted(false); // Set to false to enable starting new conversations
  };

  /**
   * Previously updated the URL - now this is an empty function as requested
   */
  const updateUrl = (conversationId: string) => {
    // Do nothing - no URL modifications as requested
  };

  // Add the handleSelectConversation function
  /**
   * Handles selecting a conversation from the list
   */
  const handleSelectConversation = (id: string) => {
    if (id === conversationId) return; // Already selected
    setConversationId(id);
    loadChatHistory(id);
  };

  useEffect(() => {
    // Focus the input when chat opens
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    // Only fetch conversations if we have an initialConversationId
    if (initialConversationId) {
      fetchConversations();
    }
    
    // Clean up any typing timers when component unmounts
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, []);

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

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!inputValue.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      role: 'user' as const,
      timestamp: new Date()
    };
    
    // Add user message to the messages array
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    
    // Clear the input field
    setInputValue('');
    
    // Reset error state
    setConversationsError(null);
    
    // Only scroll down for user's own messages
    scrollToBottom(true);
    
    // Set that a conversation has started
    setHasConversationStarted(true);
    
    setIsLoading(true);
    
    try {
      // Always use the direct Lambda sendMessageLambda function
      const result = await sendMessageLambda(userMessage.content, conversationId || undefined);
      
      // Check for error
      if (result.error) {
        if (result.status === 401 || result.status === 403) {
          // Token is invalid or expired
          console.log('Authentication error sending message, redirecting to login');
          setShowLoginModal(true);
          return;
        }
        
        throw new Error(result.error);
      }
      
      // Add bot response to messages
      if (result.chunks && result.chunks.length > 0) {
        // Get the last chunk which should have the final state
        const finalChunk = result.chunks[result.chunks.length - 1];
        
        // Create the assistant message
        const assistantMessage: Message = {
          id: Date.now().toString() + '-assistant',
          content: '',  // Start with empty content for typing animation
          fullContent: finalChunk.text || '', // Store full content for typing
          role: 'assistant' as const,
          timestamp: new Date(),
          isStreaming: true  // Add this flag to enable animation
        };
        
        // Add to messages state - the useEffect will handle scrolling for this
        setMessages((prevMessages) => [...prevMessages, assistantMessage]);
        
        // Start typing animation for this message
        safelyStartTyping(assistantMessage.id, finalChunk.text || '');
        
        // Update conversation ID if it's a new conversation
        if (finalChunk.conversationId && !conversationId) {
          console.log('New conversation started with ID:', finalChunk.conversationId);
          setConversationId(finalChunk.conversationId);
          
          // If this is a new conversation with a title in the response, set it
          if (finalChunk.title) {
            setConversationTitle(finalChunk.title);
          } else {
            // If no title was provided, derive one from the first user message
            setConversationTitle(userMessage.content.slice(0, 30) + (userMessage.content.length > 30 ? '...' : ''));
          }
          
          // Fetch conversations to get the latest list
          fetchConversations();
        }
      }
      
      // Don't need to manually scroll here - the useEffect will handle it
      // scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      setConversationsError('Failed to get a response. Please try again.');
      
      // Add error message to chat
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: Date.now().toString() + '-error',
          content: 'Sorry, there was an error processing your request. Please try again.',
          role: 'assistant' as const,
          timestamp: new Date()
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

  // Remove isTitleNew flag after animation completes
  useEffect(() => {
    if (isTitleNew) {
      const animationTimeout = setTimeout(() => {
        setIsTitleNew(false);
      }, 1000); // Match this with the animation duration

      return () => clearTimeout(animationTimeout);
    }
  }, [isTitleNew]);

  // Handle clicks outside conversation menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        conversationMenuRef.current && 
        !conversationMenuRef.current.contains(event.target as Node) &&
        isConversationMenuOpen
      ) {
        setIsConversationMenuOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isConversationMenuOpen]);

  // Add an effect to detect user scrolling
  useEffect(() => {
    const messageContainer = messageContainerRef.current;
    if (!messageContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = messageContainer;
      // Check if user is at the bottom (with 50px tolerance)
      const atBottom = scrollHeight - scrollTop - clientHeight < 50;
      setIsAtBottom(atBottom);
    };

    messageContainer.addEventListener('scroll', handleScroll);
    return () => messageContainer.removeEventListener('scroll', handleScroll);
  }, []);

  // Modify the scrollToBottom function to only scroll if user is at the bottom
  const scrollToBottom = (forceScroll = false) => {
    if (messagesEndRef.current && (forceScroll || isAtBottom)) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // This effect handles scrolling for new messages in a more controlled way
  useEffect(() => {
    // Only auto scroll when a new message is added AND user was already at the bottom
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    
    if (lastMessage && (isAtBottom || lastMessage.role === 'user')) {
      // This is a new message, scroll down only if user was at bottom
      scrollToBottom();
    }
  }, [messages, isAtBottom]);

  return (
    <div className="bg-white rounded-lg shadow-lg flex flex-col h-full w-full overflow-hidden">
      {/* Header - Make entire header clickable */}
      <div 
        className="bg-blue-700 text-white p-3 flex justify-between items-center cursor-pointer"
        onClick={onClose ? onClose : undefined}
      >
        <h3 className="font-semibold text-lg">Pantrio</h3>
        <button 
          onClick={(e) => {
            e.stopPropagation(); // Prevent triggering parent onClick
            if (onClose) onClose();
          }}
          className="text-white hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-white rounded p-1"
          aria-label="Close chat"
        >
          <FaTimes />
        </button>
      </div>
      
      {/* Conversation Title */}
      {conversationTitle && (
        <div className={`px-4 py-2 bg-gray-100 border-b border-gray-200 text-gray-700 font-medium ${isTitleNew ? 'animate-title-change' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center truncate">
              <span className="text-blue-600 mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </span>
              <span className="truncate">{conversationTitle}</span>
            </div>
            
            {/* Conversation Menu Button */}
            <div className="relative flex items-center">
              <button 
                className={`mr-2 p-1 rounded-full ${!conversationId || conversationId === null ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'hover:bg-gray-200 text-gray-600'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                onClick={() => {
                  if (conversationId) {
                    resetConversation();
                  }
                }}
                disabled={!conversationId}
                title={!conversationId ? "Already in a new conversation" : "New conversation"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
              
              <button 
                className="ml-1 p-1 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsConversationMenuOpen(!isConversationMenuOpen);
                  // Fetch latest conversations when opening menu
                  if (!isConversationMenuOpen) {
                    fetchConversations();
                  }
                }}
                title="Conversation history"
              >
                <FaBars className="h-4 w-4" />
              </button>
              
              {/* Conversation Menu Dropdown */}
              {isConversationMenuOpen && (
                <div 
                  ref={conversationMenuRef}
                  className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg z-50 overflow-hidden border border-gray-200"
                  style={{ top: '100%' }}
                >
                  <div className="py-2">
                    <div className="px-4 py-2 font-bold text-sm text-gray-700 border-b border-gray-200 flex justify-between items-center">
                      <span>Recent Conversations</span>
                      <button 
                        className="text-blue-500 hover:text-blue-700 focus:outline-none p-1 rounded-full hover:bg-blue-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          fetchConversations();
                        }}
                        disabled={isLoadingConversations}
                        title="Refresh conversations"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isLoadingConversations ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    </div>
                    
                    {isLoadingConversations ? (
                      <div className="px-4 py-3 text-sm text-gray-500 italic">Loading conversations...</div>
                    ) : conversations.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500">No recent conversations found.</div>
                    ) : (
                      <div className="max-h-64 overflow-y-auto">
                        {/* Filter out the current conversation from the list */}
                        {conversations
                          .filter(conv => conv.id !== conversationId)
                          .map(conv => (
                          <button
                            key={conv.id}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 focus:outline-none focus:bg-blue-50 truncate flex items-center justify-between"
                            onClick={() => {
                              loadChatHistory(conv.id);
                              setIsConversationMenuOpen(false);
                            }}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="truncate font-medium">{conv.title || "Conversation " + conv.id.substr(0, 8)}</div>
                              <div className="text-xs text-gray-500 truncate">
                                {formatDate(conv.updatedAt || conv.createdAt)}
                                {conv.messageCount && (
                                  <span className="ml-2 bg-gray-200 text-gray-700 rounded-full px-2 py-0.5">
                                    {conv.messageCount}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    <div className="border-t border-gray-200 mt-2 pt-2">
                      <button 
                        className={`w-full text-left px-4 py-2 text-sm ${!conversationId || conversationId === null ? 'text-gray-400 bg-gray-50 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-50'} focus:outline-none focus:bg-blue-50 flex items-center`}
                        onClick={(e) => {
                          if (conversationId) {
                            e.stopPropagation();
                            resetConversation();
                            setIsConversationMenuOpen(false);
                          }
                        }}
                        disabled={!conversationId}
                        title={!conversationId ? "Already in a new conversation" : "Start a new conversation"}
                      >
                        <span className={!conversationId ? "text-gray-400" : "text-blue-600 mr-1"}>+</span> Start New Conversation
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Messages Container - Make this scrollable */}
      <div 
        ref={messageContainerRef}
        className="flex-1 p-4 overflow-y-auto bg-gray-50"
      >
        {/* Show scroll to bottom button when user has scrolled up */}
        {!isAtBottom && (
          <button
            className="fixed bottom-20 right-8 bg-blue-600 text-white rounded-full p-2 shadow-md hover:bg-blue-700 transition-all duration-200 z-10"
            onClick={() => {
              if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            aria-label="Scroll to bottom"
          >
            <FaArrowDown className="h-4 w-4" />
          </button>
        )}
        
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
      <form onSubmit={handleSendMessage} className="border-t border-gray-200 p-3 flex flex-col bg-white mt-auto">
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

@keyframes titleChange {
  0% { background-color: rgba(96, 165, 250, 0.2); }
  50% { background-color: rgba(96, 165, 250, 0.4); }
  100% { background-color: rgba(243, 244, 246, 1); }
}

.animate-title-change {
  animation: titleChange 1s ease-out;
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