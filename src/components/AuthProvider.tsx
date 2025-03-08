'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

// Define the shape of our authentication context
type AuthContextType = {
  isLoggedIn: boolean;
  login: () => void;
  logout: () => void;
};

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  login: () => {},
  logout: () => {},
});

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Provider component that wraps the app and makes auth object available to any child component that calls useAuth()
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  
  // Check if user is logged in on initial load
  useEffect(() => {
    const authStatus = localStorage.getItem('isLoggedIn');
    setIsLoggedIn(authStatus === 'true');
    
    // If user is not logged in and trying to access /home, redirect to login page
    if (authStatus !== 'true' && pathname.startsWith('/home')) {
      router.push('/');
    }
  }, [pathname, router]);
  
  // Login function
  const login = () => {
    localStorage.setItem('isLoggedIn', 'true');
    setIsLoggedIn(true);
  };
  
  // Logout function
  const logout = () => {
    localStorage.removeItem('isLoggedIn');
    setIsLoggedIn(false);
    router.push('/');
  };
  
  // Value object that will be passed to any consumer components
  const value = {
    isLoggedIn,
    login,
    logout,
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
