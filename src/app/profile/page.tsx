'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaEnvelope, FaUser, FaSave } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { updateUserEmail } from '../actions';
import { useAuth } from '../../components/AuthProvider';

export default function ProfilePage() {
  const router = useRouter();
  const { isLoggedIn, token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  
  // Redirect if not logged in
  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/?returnUrl=/profile');
    }
  }, [isLoggedIn, router]);
  
  async function handleUpdateEmail(e: React.FormEvent) {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    if (!token) {
      toast.error('You must be logged in to update your profile');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await updateUserEmail(token, email);
      
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error(`An unexpected error occurred: ${error.message || ''}`);
      console.error('Profile update error:', error);
    } finally {
      setIsLoading(false);
    }
  }
  
  if (!isLoggedIn) {
    return <div className="min-h-screen flex items-center justify-center bg-dark-blue p-4">Redirecting to login...</div>;
  }
  
  return (
    <div className="min-h-screen bg-dark-blue p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Your Profile</h1>
          <p className="text-gray-300 mt-2">Update your account information</p>
        </div>
        
        <div className="bg-dark-blue-light border border-primary-700 shadow-xl rounded-lg p-6">
          <div className="flex items-center mb-4">
            <h2 className="text-xl font-semibold text-white">Email Settings</h2>
            <div className="ml-3 px-2 py-1 bg-red-500/20 border border-red-500 rounded text-xs text-red-400 font-medium">Required for Password Reset</div>
          </div>
          
          <p className="text-gray-300 mb-4">
            Your password reset capability depends on having a verified email address. 
            Add or update your email address below.
          </p>
          
          <form onSubmit={handleUpdateEmail} className="mt-4">
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-2">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <FaEnvelope />
                </span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="pl-10 block w-full border border-primary-700 rounded-md bg-dark-blue text-white py-2 px-3 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500"
                  required
                />
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className={`flex items-center bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                  isLoading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? (
                  <>Processing...</>
                ) : (
                  <>
                    <FaSave className="mr-2" />
                    Save Email
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
        
        <div className="bg-dark-blue-light border border-primary-700 shadow-xl rounded-lg p-6 mt-6">
          <h2 className="text-xl font-semibold text-white mb-4">Email Verification</h2>
          <p className="text-gray-300 mb-4">
            To use the password reset feature, you need a verified email address. 
            Check your inbox for a verification email after adding or updating your email.
          </p>
          
          <div className="p-4 border border-blue-500 bg-blue-500/10 rounded-md mb-4">
            <h3 className="text-blue-400 font-medium mb-2">Verification Process</h3>
            <ol className="list-decimal list-inside text-sm text-gray-300 space-y-1">
              <li>Enter your email above and click "Save Email"</li>
              <li>We'll send a verification link to your inbox</li>
              <li>Click the link in the email to verify your address</li>
              <li>Once verified, password reset will be available</li>
            </ol>
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={() => router.push('/reset-password')}
              className="bg-secondary-600 hover:bg-secondary-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary-500"
            >
              Go to Password Reset
            </button>
            
            <button
              onClick={async () => {
                if (!token) {
                  toast.error('You must be logged in to resend verification');
                  return;
                }
                
                setIsLoading(true);
                try {
                  // Use the current email in the input field
                  const result = await updateUserEmail(token, email);
                  if (result.success) {
                    toast.success('Verification email sent! Please check your inbox');
                  } else {
                    toast.error(result.message);
                  }
                } catch (error) {
                  toast.error('Failed to resend verification email');
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading || !email}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Resend Verification Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 