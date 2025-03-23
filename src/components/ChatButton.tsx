'use client';

import { useState, useRef, useEffect } from 'react';
import { FaComment } from 'react-icons/fa';
import ChatBox from './ChatBox';
import { useAuth } from './AuthProvider';
import { usePathname } from 'next/navigation';

export default function ChatButton() {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const { isLoggedIn } = useAuth();
  const pathname = usePathname();
  
  // Don't show on login page or unauthorized pages
  const isLoginPage = pathname === '/' || pathname === '/verify-email' || pathname === '/reset-password' || pathname === '/signup';
  
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
  
  // Skip rendering if not logged in or on login pages
  if (!isLoggedIn || isLoginPage) {
    return null;
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggleChat}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-xl transition-all z-50 ${
          isOpen && isMobile ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)',
        }}
        aria-label="Open chat"
      >
        <FaComment size={24} />
      </button>
      
      <div 
        className={`fixed z-50 ${!isOpen ? 'pointer-events-none' : ''}`}
        style={{ 
          bottom: isMobile ? '16px' : '2rem',
          right: isMobile ? '0' : '6rem',
          left: isMobile ? '0' : 'auto',
          top: isMobile ? '0' : 'auto',
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
            boxShadow: isOpen ? '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.2)' : 'none',
            height: isMobile ? 'calc(100% - 32px)' : '700px',
            width: isMobile ? 'calc(100% - 32px)' : '400px',
            maxHeight: isMobile ? 'calc(100% - 32px)' : '85vh',
            display: 'flex',
            flexDirection: 'column',
            margin: isMobile ? '16px' : '0',
            background: 'white',
            position: 'relative',
            top: 0,
            bottom: 0
          }}
        >
          <ChatBox onClose={() => setIsOpen(false)} />
        </div>
      </div>
    </>
  );
} 