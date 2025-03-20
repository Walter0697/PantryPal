'use client';

/**
 * Utility to synchronize JWT tokens between localStorage and cookies
 * This allows server actions to access the authentication token
 */

// Set up token synchronization on component mount
export function setupTokenSync() {
  if (typeof window === 'undefined') return;
  
  // Check for token in localStorage
  const token = localStorage.getItem('jwtToken');
  
  if (token) {
    // Set custom header that middleware will use to set the cookie
    // This is needed because server actions can't access localStorage
    document.cookie = `jwtToken=${token}; path=/; max-age=2592000; SameSite=Strict`;
    
    // Set up an interval to check for token changes (like refreshes)
    setInterval(() => {
      const currentToken = localStorage.getItem('jwtToken');
      if (currentToken !== token && currentToken) {
        document.cookie = `jwtToken=${currentToken}; path=/; max-age=2592000; SameSite=Strict`;
      }
    }, 60000); // Check every minute
  }
}

// Call this when logging in to sync the token
export function syncTokenOnLogin(token: string) {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem('jwtToken', token);
  document.cookie = `jwtToken=${token}; path=/; max-age=2592000; SameSite=Strict`;
}

// Call this when logging out
export function clearTokens() {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('jwtToken');
  document.cookie = 'jwtToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
} 