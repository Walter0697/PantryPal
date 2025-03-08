'use client';

import Link from 'next/link';
import { FaUtensils } from 'react-icons/fa';
import LogoutButton from './LogoutButton';
import { useAuth } from './AuthProvider';

export default function Navigation() {
  const { isLoggedIn } = useAuth();

  return (
    <header className="dark-element border-b border-primary-600 shadow-md">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <FaUtensils className="text-secondary-500 text-2xl" />
            <span className="text-xl font-bold text-white">PantryPal</span>
          </div>
          
          {isLoggedIn && (
            <>
              <nav className="hidden md:flex space-x-3">
                <Link 
                  href="/home" 
                  className="bg-dark-blue hover:bg-dark-blue-light text-white px-3 py-1.5 rounded-md shadow-sm border border-primary-700 transition-colors text-sm font-medium"
                >
                  Dashboard
                </Link>
                <Link 
                  href="#" 
                  className="bg-dark-blue hover:bg-dark-blue-light text-white px-3 py-1.5 rounded-md shadow-sm border border-primary-700 transition-colors text-sm font-medium"
                >
                  Inventory
                </Link>
                <Link 
                  href="#" 
                  className="bg-dark-blue hover:bg-dark-blue-light text-white px-3 py-1.5 rounded-md shadow-sm border border-primary-700 transition-colors text-sm font-medium"
                >
                  Shopping List
                </Link>
                <Link 
                  href="#" 
                  className="bg-dark-blue hover:bg-dark-blue-light text-white px-3 py-1.5 rounded-md shadow-sm border border-primary-700 transition-colors text-sm font-medium"
                >
                  Recipes
                </Link>
              </nav>
              
              <div className="flex items-center space-x-4">
                <LogoutButton />
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
