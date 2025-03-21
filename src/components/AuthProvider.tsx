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
  updateEmailVerificationStatus: (verified: boolean) => void;
  emailVerified: boolean;
};

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  login: () => {},
  logout: () => {},
  token: null,
  updateEmailVerificationStatus: () => {},
  emailVerified: false,
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
  const cookieValue = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  
  // Set the cookie
  document.cookie = cookieValue;
  
  // Also try setting with expires date for better compatibility
  try {
    const expirationDate = new Date();
    expirationDate.setTime(expirationDate.getTime() + (maxAge * 1000));
    
    const altCookieValue = `${name}=${encodeURIComponent(value)}; path=/; expires=${expirationDate.toUTCString()}; SameSite=Lax`;
    document.cookie = altCookieValue;
  } catch (e) {
    // Silent catch - first method is the primary one
  }
  
  return true;
};

// Provider component that wraps the app and makes auth object available to any child component that calls useAuth()
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  
  // Logout function - clear both localStorage and cookie
  const logout = useCallback(() => {
    try {
      // Clear localStorage
      localStorage.removeItem('jwtToken');
      localStorage.removeItem('emailVerified');
      localStorage.removeItem('username');
      
      // Clear JWT cookie
      document.cookie = 'jwtToken=; path=/; max-age=0; SameSite=Lax';
      
      // Clear username cookie
      document.cookie = 'username=; path=/; max-age=0; SameSite=Lax';
      
      // Double check the cookies were cleared
      const jwtCookieStillExists = document.cookie.includes('jwtToken=');
      const usernameCookieStillExists = document.cookie.includes('username=');
      
      if (jwtCookieStillExists || usernameCookieStillExists) {
        // Try several alternative methods to ensure the cookies are cleared
        document.cookie = 'jwtToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'jwtToken=; path=/; max-age=-1';
        document.cookie = 'username=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'username=; path=/; max-age=-1';
      }
      
      // Update state
      setToken(null);
      setIsLoggedIn(false);
      setEmailVerified(false);
      
      // Redirect to login page if not already there
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        window.location.href = '/';
      }
    } catch (error) {
      // Even if there's an error, attempt to update state and redirect
      setToken(null);
      setIsLoggedIn(false);
      setEmailVerified(false);
      
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
  
  // Update email verification status
  const updateEmailVerificationStatus = useCallback((verified: boolean) => {
    setEmailVerified(verified);
    
    // Optional: store this status in localStorage for persistence
    try {
      localStorage.setItem('emailVerified', String(verified));
    } catch (error) {
      // Silently handle errors
    }
  }, []);
  
  // Initialize auth state from localStorage
  useEffect(() => {
    // Safe localStorage access
    try {
      const storedToken = getToken();
      
      // Also load email verification status
      try {
        const storedEmailVerified = localStorage.getItem('emailVerified');
        if (storedEmailVerified !== null) {
          setEmailVerified(storedEmailVerified === 'true');
        }
      } catch (e) {
        // Silent catch - email verification is optional
      }
      
      if (storedToken && isTokenValid(storedToken)) {
        // Token is valid
        setToken(storedToken);
        setIsLoggedIn(true);
        
        // Setup token refresh/expiration handling
        const cleanup = setupTokenRefresh(storedToken);
        
        setIsInitialized(true);
        return cleanup;
      } else if (storedToken) {
        // Token exists but is invalid - clear it
        try {
          localStorage.removeItem('jwtToken');
        } catch (e) {
          // Silent catch
        }
        
        setIsInitialized(true);
        
        // Only redirect if not already on login page and not an API route
        if (pathname !== '/' && !pathname.startsWith('/api')) {
          router.push('/');
        }
      } else {
        // No token at all
        setIsInitialized(true);
        
        // Only redirect if not already on login page and not an API route
        if (pathname !== '/' && !pathname.startsWith('/api')) {
          router.push('/');
        }
      }
    } catch (error) {
      setIsInitialized(true);
      
      // Safety redirect on error
      if (pathname !== '/' && !pathname.startsWith('/api')) {
        router.push('/');
      }
    }
  }, [pathname, router, setupTokenRefresh]);
  
  // Login function - now accepts token and expiration
  const login = useCallback((newToken: string, expiresIn: number) => {
    try {
      // Extract username from token
      try {
        const tokenData = JSON.parse(atob(newToken.split('.')[1]));
        const username = tokenData['cognito:username'] || tokenData.username || tokenData.preferred_username;
        
        // Store username in localStorage and cookies for accessibility
        if (username) {
          // Save to localStorage
          localStorage.setItem('username', username);
          
          // Save to cookies so backend can access it
          const maxAgeSeconds = Math.min(expiresIn, 60 * 60 * 24 * 7); // Same expiry as JWT
          setCookie('username', username, maxAgeSeconds);
        }
      } catch (tokenDecodeError) {
        // Silent catch - no username in cookies is acceptable
      }
      
      // Store token in localStorage with error handling
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('jwtToken', newToken);
        
        // CRITICAL FIX: Set cookie that middleware can access
        try {
          // Use a more reliable cookie setting approach with max age in seconds
          // Cap at 7 days for safety even if token has longer expiration
          const maxAgeSeconds = Math.min(expiresIn, 60 * 60 * 24 * 7);
          
          // Try to set cookie with our improved helper function
          setCookie('jwtToken', newToken, maxAgeSeconds);
        } catch (cookieError) {
          // Silent catch - localStorage is the backup
        }
      }
      
      // Update state
      setToken(newToken);
      setIsLoggedIn(true);
      
      // Setup token refresh/expiration handling
      setupTokenRefresh(newToken);
    } catch (error) {
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
    updateEmailVerificationStatus,
    emailVerified,
  };
  
  // Only render children once authentication state is initialized
  if (!isInitialized) {
    return <div>Loading...</div>;
  }
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
