'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaUser, FaLock, FaUtensils } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { authenticate } from './actions';
import { useAuth } from '../components/AuthProvider';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [returnUrl, setReturnUrl] = useState('/home');

  // Get the return URL from the query parameters if available
  useEffect(() => {
    const urlReturnPath = searchParams.get('returnUrl');
    if (urlReturnPath) {
      setReturnUrl(urlReturnPath);
    }
  }, [searchParams]);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    
    try {
      // Call the server action
      const result = await authenticate(formData);
      
      if (result.success) {
        toast.success(result.message);
        // Store the JWT token and set login state
        if (result.token && result.expiresIn) {
          login(result.token, result.expiresIn);
          // Redirect to the return URL or home page
          router.push(returnUrl || '/home');
        } else {
          toast.error('Authentication failed: Missing token information');
        }
      } else {
        // Show error toast on failed login
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex-grow flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <FaUtensils className="text-secondary-500 text-5xl" />
          </div>
          <h1 className="text-3xl font-bold text-white">Welcome to PantryPal</h1>
          <p className="text-gray-300 mt-2">Your kitchen inventory management solution</p>
        </div>

        <form action={handleSubmit} className="bg-dark-blue-light border border-primary-700 shadow-xl rounded-lg p-8">
          <div className="mb-6">
            <label htmlFor="username" className="block text-gray-200 text-sm font-medium mb-2">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaUser className="text-primary-400" />
              </div>
              <input
                id="username"
                name="username"
                type="text"
                placeholder="Enter your username"
                className="w-full pl-10 pr-3 py-2 bg-dark-blue border border-primary-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-200 text-sm font-medium mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaLock className="text-primary-400" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                className="w-full pl-10 pr-3 py-2 bg-dark-blue border border-primary-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-dark-blue hover:bg-dark-blue-light text-white font-medium py-3 px-4 rounded-md shadow-md border border-primary-600 transition duration-300 ease-in-out ${
              isLoading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
          
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Track your kitchen inventory, create shopping lists, and never run out of essential ingredients again.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
