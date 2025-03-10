'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import React from 'react';

export default function RedirectHelper() {
  const [showDebug, setShowDebug] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check tokens in both localStorage and cookies
  const hasLocalStorageToken = typeof window !== 'undefined' ? !!localStorage.getItem('jwtToken') : false;
  const hasCookieToken = typeof document !== 'undefined' ? document.cookie.includes('jwtToken=') : false;

  // Get query parameters 
  const returnUrl = searchParams.get('returnUrl');
  const reason = searchParams.get('reason');
  const timestamp = searchParams.get('timestamp');

  // AUTOMATIC COOKIE FIX: If we have localStorage token but no cookie, fix it automatically
  useEffect(() => {
    if (hasLocalStorageToken && !hasCookieToken) {
      console.log('🔄 RedirectHelper: Automatically fixing missing cookie...');
      try {
        const tokenFromLocalStorage = localStorage.getItem('jwtToken');
        if (tokenFromLocalStorage) {
          document.cookie = `jwtToken=${tokenFromLocalStorage}; path=/; max-age=86400; SameSite=Lax`;
          console.log('🔄 RedirectHelper: Auto-fixed cookie. Reloading in 1 second...');
          
          // Reload after a short delay to allow cookie to be set
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      } catch (error) {
        console.error('🔄 RedirectHelper: Failed to auto-fix cookie:', error);
      }
    }
  }, [hasLocalStorageToken, hasCookieToken]);

  // Auto-redirect if needed
  useEffect(() => {
    // Collect information about the current URL and any redirect parameters
    const returnUrl = searchParams.get('returnUrl');
    const reason = searchParams.get('reason');
    const timestamp = searchParams.get('timestamp');
    
    // Check both localStorage and cookie for token
    const hasLocalStorageToken = !!localStorage.getItem('jwtToken');
    const hasCookieToken = document.cookie.includes('jwtToken=');
    
    const info = {
      currentPath: window.location.pathname,
      fullUrl: window.location.href,
      returnUrl,
      reason,
      timestamp: timestamp ? new Date(parseInt(timestamp)).toISOString() : null,
      hasLocalStorageToken,
      hasCookieToken,
      tokenStatus: hasLocalStorageToken 
        ? (hasCookieToken ? 'Complete (both storage and cookie)' : 'Incomplete (missing cookie)')
        : (hasCookieToken ? 'Incomplete (missing localStorage)' : 'Missing (no token)'),
      // Check if we should auto-redirect
      shouldAutoRedirect: returnUrl === '/home' && hasLocalStorageToken && hasCookieToken
    };
    
    console.log('RedirectHelper: Token status:', info.tokenStatus);
    
    // Attempt auto-redirect if appropriate
    if (info.shouldAutoRedirect) {
      console.log('RedirectHelper: Auto-redirecting to home page');
      setTimeout(() => {
        router.push('/home');
      }, 1000);
    }
  }, [searchParams, router]);

  // Create info object for debugging
  const info = {
    currentPath: window.location.pathname,
    fullUrl: window.location.href,
    returnUrl,
    reason,
    timestamp: timestamp ? new Date(parseInt(timestamp)).toISOString() : null,
    hasLocalStorageToken,
    hasCookieToken,
    tokenStatus: hasLocalStorageToken 
      ? (hasCookieToken ? 'Complete (both storage and cookie)' : 'Incomplete (missing cookie)')
      : (hasCookieToken ? 'Incomplete (missing localStorage)' : 'Missing (no token)'),
    // Check if we should auto-redirect
    shouldAutoRedirect: returnUrl === '/home' && hasLocalStorageToken && hasCookieToken
  };
  
  // Toggle debug panel visibility
  const toggleDebug = () => {
    setShowDebug(prev => !prev);
  };
  
  const handleManualRedirect = (path: string) => {
    if (!path) return;
    
    console.log(`RedirectHelper: Manual redirect to ${path}`);
    router.push(path);
  };

  // Don't render anything if there's no redirect info
  if (!info.returnUrl) return null;

  return (
    <div className="fixed top-2 right-2 z-50">
      <button 
        onClick={toggleDebug}
        className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
      >
        {showDebug ? 'Hide Redirect Info' : 'Redirect Info'}
      </button>
      
      {showDebug && (
        <div className="bg-white border border-blue-500 p-4 rounded shadow-lg mt-2 max-w-sm overflow-auto text-xs">
          <h3 className="font-bold mb-2">Redirect Information</h3>
          
          <div className="mb-2">
            <strong>Current URL:</strong> {info.currentPath}
          </div>
          
          {info.returnUrl && (
            <div className="mb-2">
              <strong>Return URL:</strong> {info.returnUrl}
              <button 
                onClick={() => info.returnUrl && handleManualRedirect(info.returnUrl)}
                className="ml-2 bg-green-500 text-white px-2 py-0.5 rounded text-xs"
              >
                Go Now
              </button>
            </div>
          )}
          
          {info.reason && (
            <div className="mb-2">
              <strong>Reason:</strong> {info.reason}
            </div>
          )}
          
          <div className="mt-2 mb-2 font-bold">Token Status:</div>
          
          <div className={info.hasLocalStorageToken ? "text-green-600 mb-1" : "text-red-600 mb-1"}>
            <strong>LocalStorage:</strong> {info.hasLocalStorageToken ? "Present" : "Missing"}
          </div>
          
          <div className={info.hasCookieToken ? "text-green-600 mb-1" : "text-red-600 mb-1"}>
            <strong>Cookie:</strong> {info.hasCookieToken ? "Present" : "Missing"}
          </div>
          
          <div className="mt-2">
            <strong>Overall:</strong> {info.tokenStatus}
          </div>
          
          {!info.hasCookieToken && info.hasLocalStorageToken && (
            <div className="mt-2 text-orange-500 font-bold">
              Cookie missing! Middleware can't see your token.
              <button 
                onClick={() => {
                  // Try to fix the cookie from localStorage
                  const token = localStorage.getItem('jwtToken');
                  if (token) {
                    document.cookie = `jwtToken=${token}; path=/; max-age=86400; SameSite=Strict`;
                    window.location.reload();
                  }
                }}
                className="mt-1 bg-orange-500 text-white px-2 py-0.5 rounded text-xs block w-full"
              >
                Try to fix cookie
              </button>
            </div>
          )}
          
          {info.shouldAutoRedirect && (
            <div className="mt-2 text-green-600 font-bold">
              Auto-redirect will happen in a moment...
            </div>
          )}
        </div>
      )}
    </div>
  );
} 