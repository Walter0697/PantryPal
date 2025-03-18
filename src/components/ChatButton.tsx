'use client';

import { useState, useRef, useEffect } from 'react';
import { FaComment } from 'react-icons/fa';
import ChatBox from './ChatBox';

export default function ChatButton() {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [buttonPosition, setButtonPosition] = useState({ left: 0, top: 0 });
  
  useEffect(() => {
    if (buttonRef.current) {
      // Get the button's position information
      const rect = buttonRef.current.getBoundingClientRect();
      // We want the left and top position of the button
      setButtonPosition({ 
        left: rect.left,
        top: rect.top
      });
    }
    
    // Update position on window resize
    const handleResize = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setButtonPosition({ 
          left: rect.left,
          top: rect.top
        });
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggleChat}
        className="fixed bottom-16 right-6 w-14 h-14 rounded-full bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center shadow-lg transition-all z-40"
        aria-label="Open chat"
      >
        <FaComment size={24} />
      </button>
      
      <div 
        className="fixed z-50"
        style={{ 
          bottom: '4rem',
          right: '6rem',
          marginRight: '1rem' // Add some spacing between the button and the chatbox
        }}
      >
        <div 
          className={`transition-all duration-300 ${
            isOpen 
              ? 'opacity-100 translate-x-0' 
              : 'opacity-0 translate-x-16 pointer-events-none'
          }`}
          style={{
            transformOrigin: 'center right',
            transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Bounce effect
            boxShadow: isOpen ? '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' : 'none',
            height: '400px', // Set consistent height
            width: '350px',  // Set consistent width
            maxHeight: '70vh', // Limit height on smaller screens
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <ChatBox onClose={() => setIsOpen(false)} />
        </div>
      </div>
    </>
  );
} 