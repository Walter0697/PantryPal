'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { getToken, isTokenValid, getTokenRemainingTime } from '../util/auth';

// Define the shape of our authentication context
type AuthContextType = {
  isLoggedIn: boolean;
  login: (token: string, expiresIn: number) => void;
  logout: () => void;
  token: string | null;
};

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  login: () => {},
  logout: () => {},
  token: null,
});

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// Setting up token refresh parameters
const TOKEN_REFRESH_THRESHOLD = 5 * 60; // 5 minutes in seconds

// A helper function to reliably set cookies
const setCookie = (name: string, value: string, maxAge: number) => {
  // Build the cookie string with all essential attributes
  // SameSite=Lax is important for modern browsers
  // Using maxAge instead of expires for better compatibility
  const cookieValue = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
  
  // Set the cookie
  document.cookie = cookieValue;
  
  // Verify the cookie was set
  return document.cookie.includes(`${name}=`);
};

// Provider component that wraps the app and makes auth object available to any child component that calls useAuth()
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  
  // Logout function - clear both localStorage and cookie
  const logout = useCallback(() => {
    console.log('Logging out user...');
    
    try {
      // Clear localStorage
      localStorage.removeItem('jwtToken');
      console.log('Cleared localStorage token');
      
      // Clear cookie by setting it to expire immediately
      document.cookie = 'jwtToken=; path=/; max-age=0; SameSite=Lax';
      
      // Double check the cookie was cleared
      const cookieStillExists = document.cookie.includes('jwtToken=');
      if (cookieStillExists) {
        console.warn('First cookie clearing attempt failed, trying alternative approach');
        // Try several alternative methods to ensure the cookie is cleared
        document.cookie = 'jwtToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'jwtToken=; path=/; max-age=-1';
      }
      
      console.log('Cleared authentication cookie');
      
      // Update state
      setToken(null);
      setIsLoggedIn(false);
      
      // Redirect to login page if not already there
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        console.log('Redirecting to login page after logout');
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Error during logout:', error);
      
      // Even if there's an error, attempt to update state and redirect
      setToken(null);
      setIsLoggedIn(false);
      
      // Force redirect as a last resort
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  }, []);
  
  // Token refresh logic - for a real app, implement token refresh with your API
  const setupTokenRefresh = useCallback((token: string) => {
    const remainingTime = getTokenRemainingTime(token);
    
    if (remainingTime <= 0) {
      // Token already expired
      logout();
      return;
    }

    // If token is about to expire, we'd ideally refresh it
    // For now, we'll just setup a timer to logout when it expires
    if (remainingTime <= TOKEN_REFRESH_THRESHOLD) {
      // In a real app, this is where you'd call your refresh token API
      console.log(`Token will expire in ${remainingTime} seconds`);
    }

    // Set timer to check token expiration
    const timeoutId = setTimeout(() => {
      const isValid = isTokenValid(token);
      if (!isValid) {
        logout();
      }
    }, (remainingTime - 10) * 1000); // Check 10 seconds before expiry

    return () => clearTimeout(timeoutId);
  }, [logout]);
  
  // Initialize auth state from localStorage
  useEffect(() => {
    // Safe localStorage access
    try {
      const storedToken = getToken();
      
      if (storedToken && isTokenValid(storedToken)) {
        // Token is valid
        setToken(storedToken);
        setIsLoggedIn(true);
        
        // Setup token refresh/expiration handling
        const cleanup = setupTokenRefresh(storedToken);
        console.log('AuthProvider: Initialized with valid token');
        
        setIsInitialized(true);
        return cleanup;
      } else if (storedToken) {
        // Token exists but is invalid - clear it
        try {
          localStorage.removeItem('jwtToken');
        } catch (e) {
          console.error('LocalStorage access error:', e);
        }
        console.log('AuthProvider: Removed invalid token');
        
        setIsInitialized(true);
        
        // Only redirect if not already on login page and not an API route
        if (pathname !== '/' && !pathname.startsWith('/api')) {
          router.push('/');
        }
      } else {
        // No token at all
        console.log('AuthProvider: No token found');
        setIsInitialized(true);
        
        // Only redirect if not already on login page and not an API route
        if (pathname !== '/' && !pathname.startsWith('/api')) {
          router.push('/');
        }
      }
    } catch (error) {
      console.error('Error initializing auth state:', error);
      setIsInitialized(true);
      
      // Safety redirect on error
      if (pathname !== '/' && !pathname.startsWith('/api')) {
        router.push('/');
      }
    }
  }, [pathname, router, setupTokenRefresh]);
  
  // Login function - now accepts token and expiration
  const login = useCallback((newToken: string, expiresIn: number) => {
    console.log('AuthProvider: Setting up login with token');
    
    try {
      // Store token in localStorage with error handling
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('jwtToken', newToken);
        console.log('Token successfully stored in localStorage');
        
        // CRITICAL FIX: Set cookie that middleware can access
        try {
          // Ensure the cookie doesn't exceed reasonable size limits
          if (newToken.length > 4000) {
            console.warn('Token is very large (>4KB), which may cause issues with cookies');
          }
          
          // Use a more reliable cookie setting approach with max age in seconds
          // Cap at 7 days for safety even if token has longer expiration
          const maxAgeSeconds = Math.min(expiresIn, 60 * 60 * 24 * 7);
          
          // Try to set cookie with our helper function
          const cookieSet = setCookie('jwtToken', newToken, maxAgeSeconds);
          
          if (!cookieSet) {
            console.warn('Primary cookie setting failed, trying with a shorter token');
            
            // If the full token fails, we can try with just the first part 
            // (this is better than no cookie at all, but will fail validation)
            const shortToken = newToken.substring(0, 2000);
            const emergencyCookieSet = setCookie('jwtToken', shortToken, maxAgeSeconds);
            
            if (!emergencyCookieSet) {
              console.error('All cookie setting attempts failed - middleware authentication will not work');
            } else {
              console.log('Emergency cookie set with truncated token - validation may fail');
            }
          } else {
            console.log('Cookie set successfully');
          }
        } catch (cookieError) {
          console.error('Error setting cookie:', cookieError);
        }
      } else {
        console.error('localStorage not available');
      }
      
      // Update state
      setToken(newToken);
      setIsLoggedIn(true);
      
      // Setup token refresh/expiration handling
      setupTokenRefresh(newToken);
      
      // Validate token right after storing - with retry logic
      const validateTokenStorage = () => {
        try {
          const storedToken = localStorage.getItem('jwtToken');
          const hasCookie = document.cookie.includes('jwtToken=');
          
          if (!storedToken || storedToken !== newToken) {
            console.error('Token validation after login failed - stored token does not match provided token');
          } else if (!hasCookie) {
            console.error('Token cookie not set properly - middleware will not be able to access token');
            
            // Try to fix the cookie one more time
            try {
              setCookie('jwtToken', newToken, 86400);
              console.log('Attempted emergency cookie fix');
            } catch (e) {
              console.error('Emergency cookie fix failed:', e);
            }
          } else {
            console.log('Token validated after login (localStorage and cookie)');
          }
        } catch (e) {
          console.error('Error validating token after login:', e);
        }
      };
      
      // Check immediately and then again after a short delay
      validateTokenStorage();
      setTimeout(validateTokenStorage, 500);
    } catch (error) {
      console.error('Error in login function:', error);
      // Still update the in-memory state even if localStorage fails
      setToken(newToken);
      setIsLoggedIn(true);
    }
  }, [setupTokenRefresh]);
  
  // Value object that will be passed to any consumer components
  const value = {
    isLoggedIn,
    login,
    logout,
    token,
  };
  
  // Only render children once authentication state is initialized
  if (!isInitialized) {
    return <div>Loading...</div>;
  }
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
