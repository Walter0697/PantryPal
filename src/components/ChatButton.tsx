'use client';

import { useState, useRef, useEffect } from 'react';
import { FaComment } from 'react-icons/fa';
import ChatBox from './ChatBox';

export default function ChatButton() {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Check if we're on mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkMobile();
    
    // Update on resize
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggleChat}
        className={`fixed bottom-16 right-6 w-14 h-14 rounded-full bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center shadow-lg transition-all z-40 ${
          isOpen && isMobile ? 'opacity-0' : 'opacity-100'
        }`}
        aria-label="Open chat"
      >
        <FaComment size={24} />
      </button>
      
      <div 
        className={`fixed z-50 ${!isOpen ? 'pointer-events-none' : ''}`}
        style={{ 
          bottom: isMobile ? '16px' : '4rem',
          right: isMobile ? '16px' : '6rem',
          left: isMobile ? '16px' : 'auto',
          top: isMobile ? '16px' : 'auto',
          marginRight: isMobile ? '0' : '1rem',
          transition: 'all 0.3s ease'
        }}
      >
        <div 
          className={`transition-all duration-300 ${
            isOpen 
              ? 'opacity-100 translate-x-0 rounded-lg overflow-hidden' 
              : 'opacity-0 translate-x-16 pointer-events-none'
          }`}
          style={{
            transformOrigin: 'center right',
            transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Bounce effect
            boxShadow: isOpen ? '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' : 'none',
            height: isMobile ? 'calc(100vh - 32px)' : '700px',
            width: isMobile ? '100%' : '400px',
            maxHeight: isMobile ? 'calc(100vh - 32px)' : '85vh',
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