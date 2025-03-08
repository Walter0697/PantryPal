'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { FaUtensils, FaBars, FaSignOutAlt, FaList } from 'react-icons/fa';
import { useAuth } from './AuthProvider';
import { useRouter } from 'next/navigation';

export default function Navigation() {
  const { isLoggedIn, logout } = useAuth();
  const router = useRouter();
  
  const handleLogout = () => {
    logout();
  };
  
  const navigateToHome = () => {
    router.push('/home');
  };

  return (
    <header className="dark-element border-b border-primary-600 shadow-md">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div 
            className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity" 
            onClick={navigateToHome}
          >
            <FaUtensils className="text-secondary-500 text-2xl" />
            <span className="text-xl font-bold text-white hover:text-secondary-500 transition-colors">PantryPal</span>
          </div>
          
          {isLoggedIn && (
            <button
              onClick={handleLogout}
              className="flex items-center bg-dark-blue hover:bg-dark-blue-light text-white hover:text-secondary-500 px-3 py-1.5 rounded-md shadow-sm border border-primary-700 transition-colors cursor-pointer"
              aria-label="Logout"
            >
              <FaSignOutAlt className="text-sm mr-2" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
