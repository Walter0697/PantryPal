'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaLock, FaUserShield } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { completeNewPassword } from '../actions';
import { useAuth } from '../../components/AuthProvider';

export default function ChangePasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [session, setSession] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [returnUrl, setReturnUrl] = useState('/home');
  const hasInitialized = useRef(false);

  // Get parameters from URL - with enhanced debugging
  useEffect(() => {
    // Store URL params directly from the window location to avoid any Next.js routing issues
    const params = new URLSearchParams(window.location.search);
    const urlUsername = params.get('username');
    const urlSession = params.get('session');
    const urlReturn = params.get('returnUrl');
    
    console.log('Change password page loaded (raw URL):', window.location.href);
    console.log('Direct URL params:', { 
      username: urlUsername, 
      sessionLength: urlSession?.length || 0,
      returnUrl: urlReturn 
    });

    // Try Next.js searchParams too
    const nextUsername = searchParams.get('username');
    const nextSession = searchParams.get('session');
    
    console.log('Next.js URL params:', { 
      username: nextUsername, 
      sessionLength: nextSession?.length || 0, 
      nextParamsExist: !!nextUsername && !!nextSession 
    });

    // Use either source of params (direct URL preferred)
    const finalUsername = urlUsername || nextUsername || '';
    const finalSession = urlSession || nextSession || '';
    const finalReturn = urlReturn || searchParams.get('returnUrl') || '/home';

    // Only set state and redirect if we haven't already initialized
    // This prevents multiple redirections
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      
      // Set the state even if parameters are missing to show the form
      setUsername(finalUsername);
      setSession(finalSession);
      setReturnUrl(finalReturn);

      // Only redirect if absolutely necessary
      if (!finalUsername || !finalSession) {
        console.error('Missing required params for password change', { 
          username: finalUsername, 
          sessionExists: !!finalSession
        });
        
        // Use setTimeout to delay the redirect, giving the user a chance to see the error
        setTimeout(() => {
          toast.error('Missing required information for password change');
          router.push('/');
        }, 1500);
      }
    }
  }, [searchParams, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // More validation to ensure we have the required data
    if (!username || !session) {
      toast.error('Missing session information. Please try logging in again.');
      console.error('Submit attempted without username/session', { 
        usernameExists: !!username, 
        sessionExists: !!session 
      });
      return;
    }
    
    // Validate passwords
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);
    
    try {
      // Call the password change function without email parameter
      console.log('Attempting to complete password change');
      const result = await completeNewPassword(username, newPassword, session);
      
      if (result.success) {
        toast.success(result.message);
        // Store the JWT token and set login state
        if (result.token && result.expiresIn) {
          login(result.token, result.expiresIn);
          // Redirect to the return URL or home page
          router.push(returnUrl || '/home');
        } else {
          toast.error('Authentication failed: Missing token information');
          router.push('/');
        }
      } else {
        // Show error toast on failed password change
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
      console.error('Password change error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Change Your Password</h1>
          <p className="mt-2 text-gray-600">
            You need to set a new password before you can login
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Username field (disabled, just for display) */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <div className="mt-1 relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <FaUserShield />
              </span>
              <input
                id="username"
                type="text"
                value={username}
                disabled
                className="pl-10 block w-full border-gray-300 rounded-md shadow-sm bg-gray-100"
              />
            </div>
          </div>
          
          {/* New Password */}
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <div className="mt-1 relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <FaLock />
              </span>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your new password"
              />
            </div>
          </div>
          
          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm Password
            </label>
            <div className="mt-1 relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <FaLock />
              </span>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Confirm your new password"
              />
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'Changing Password...' : 'Change Password & Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 