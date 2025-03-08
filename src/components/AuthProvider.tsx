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
export const useAuth = () => useContext(AuthContext);

// Setting up token refresh parameters
const TOKEN_REFRESH_THRESHOLD = 5 * 60; // 5 minutes in seconds

// Provider component that wraps the app and makes auth object available to any child component that calls useAuth()
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  
  // Logout function
  const logout = useCallback(() => {
    localStorage.removeItem('jwtToken');
    setToken(null);
    setIsLoggedIn(false);
    if (pathname !== '/') {
      router.push('/');
    }
  }, [pathname, router]);

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
  
  // Check if user is logged in on initial load
  useEffect(() => {
    const storedToken = getToken();
    
    if (storedToken && isTokenValid(storedToken)) {
      // Token is valid
      setToken(storedToken);
      setIsLoggedIn(true);
      
      // Setup token refresh/expiration handling
      return setupTokenRefresh(storedToken);
    } else if (storedToken) {
      // Token exists but is invalid
      logout();
    } else if (pathname !== '/' && !pathname.startsWith('/api')) {
      // No token and trying to access protected route
      router.push('/');
    }
  }, [pathname, router, logout, setupTokenRefresh]);
  
  // Login function - now accepts token and expiration
  const login = useCallback((newToken: string, expiresIn: number) => {
    localStorage.setItem('jwtToken', newToken);
    setToken(newToken);
    setIsLoggedIn(true);
    
    // Setup token refresh/expiration handling
    setupTokenRefresh(newToken);
  }, [setupTokenRefresh]);
  
  // Value object that will be passed to any consumer components
  const value = {
    isLoggedIn,
    login,
    logout,
    token,
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
