'use client';

import { useState, useEffect } from 'react';

export default function TokenDebugger() {
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    // Only run on client
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('jwtToken');
      
      if (token) {
        try {
          // Parse token (which is a JWT)
          const parts = token.split('.');
          if (parts.length === 3) {
            const header = JSON.parse(atob(parts[0]));
            const payload = JSON.parse(atob(parts[1]));
            
            // Calculate expiration
            const expDate = payload.exp ? new Date(payload.exp * 1000) : 'No expiration';
            const now = new Date();
            const isExpired = payload.exp ? payload.exp * 1000 < now.getTime() : 'Unknown';
            
            setTokenInfo({
              header,
              payload,
              expiration: expDate,
              now,
              isExpired,
              tokenLength: token.length,
              firstChars: token.substring(0, 15) + '...'
            });
          } else {
            setTokenInfo({ error: 'Invalid JWT format' });
          }
        } catch (e) {
          setTokenInfo({ error: 'Error parsing token', details: e });
        }
      } else {
        setTokenInfo({ error: 'No token in localStorage' });
      }
    }
  }, []);

  // Refresh token info every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('jwtToken');
        if (token && tokenInfo && !tokenInfo.error) {
          const now = new Date();
          setTokenInfo(prev => ({
            ...prev,
            now,
            isExpired: prev.payload.exp 
              ? prev.payload.exp * 1000 < now.getTime() 
              : 'Unknown'
          }));
        }
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [tokenInfo]);

  // Toggle debug panel visibility
  const toggleDebug = () => {
    setShowDebug(prev => !prev);
  };

  // Don't render anything if there's no token info or not showing debug
  if (!tokenInfo) return null;

  return (
    <div className="fixed bottom-2 right-2 z-50">
      <button 
        onClick={toggleDebug}
        className="bg-gray-800 text-white px-2 py-1 rounded text-xs opacity-70 hover:opacity-100"
      >
        {showDebug ? 'Hide' : 'Debug'}
      </button>
      
      {showDebug && (
        <div className="bg-black bg-opacity-80 text-white p-4 rounded shadow-lg mt-2 max-w-sm max-h-60 overflow-auto text-xs">
          {tokenInfo.error ? (
            <div className="text-red-400">
              <strong>Error:</strong> {tokenInfo.error}
              {tokenInfo.details && <pre>{JSON.stringify(tokenInfo.details, null, 2)}</pre>}
            </div>
          ) : (
            <>
              <div className="mb-2">
                <strong>Token:</strong> {tokenInfo.firstChars} ({tokenInfo.tokenLength} chars)
              </div>
              <div className="mb-2">
                <strong>Subject:</strong> {tokenInfo.payload.sub || 'None'}
              </div>
              <div className="mb-2">
                <strong>Expires:</strong> {tokenInfo.expiration.toString()}
              </div>
              <div className="mb-2">
                <strong>Now:</strong> {tokenInfo.now.toString()}
              </div>
              <div className={tokenInfo.isExpired === true ? 'text-red-400' : 'text-green-400'}>
                <strong>Status:</strong> {tokenInfo.isExpired === true ? 'Expired' : 'Valid'}
              </div>
              <div>
                <button 
                  onClick={() => {
                    localStorage.removeItem('jwtToken');
                    setTokenInfo({ error: 'Token cleared' });
                  }}
                  className="mt-2 bg-red-600 text-white px-2 py-1 rounded text-xs"
                >
                  Clear Token
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
} 