'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaUser, FaLock, FaKey, FaEnvelope } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { forgotPassword, confirmForgotPassword } from '../actions';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  
  // Pre-fill identifier if it's in the URL (from email link)
  const [identifier, setIdentifier] = useState<string>('');
  
  // State for the reset code flow
  const [showCodeForm, setShowCodeForm] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Check for identifier in URL query params on initial load
  useEffect(() => {
    const urlUsername = searchParams.get('username');
    if (urlUsername) {
      setIdentifier(urlUsername);
      // If we have an identifier from URL, show the code form directly
      setShowCodeForm(true);
    }
    
    // Also check for code in the URL
    const urlCode = searchParams.get('code');
    if (urlCode) {
      setResetCode(urlCode);
    }
  }, [searchParams]);
  
  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault();
    
    if (!identifier.trim()) {
      toast.error('Please enter your username');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await forgotPassword(identifier);
      
      if (result.success) {
        toast.success(result.message);
        setShowCodeForm(true);
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error(`An unexpected error occurred: ${error.message || ''}`);
      console.error('Reset code request error:', error);
    } finally {
      setIsLoading(false);
    }
  }
  
  async function handleConfirmReset(e: React.FormEvent) {
    e.preventDefault();
    
    if (!resetCode.trim()) {
      toast.error('Please enter the confirmation code from your email');
      return;
    }
    
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
      const result = await confirmForgotPassword(
        identifier,
        resetCode,
        newPassword
      );
      
      if (result.success) {
        toast.success(result.message);
        
        // Wait a moment before redirecting to login
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error(`An unexpected error occurred: ${error.message || ''}`);
      console.error('Password reset error:', error);
    } finally {
      setIsLoading(false);
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-blue p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Reset Your Password</h1>
          <p className="mt-2 text-gray-300">
            {!showCodeForm 
              ? 'Enter your username to receive a reset code' 
              : 'Enter the verification code sent to your email'}
          </p>
        </div>
        
        {!showCodeForm ? (
          // Request Code Form
          <form onSubmit={handleRequestCode} className="mt-8 space-y-6 bg-dark-blue-light p-8 rounded-lg shadow-lg border border-primary-700">
            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-gray-200">
                Username
              </label>
              <div className="mt-1 relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <FaUser />
                </span>
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="pl-10 block w-full border-primary-700 rounded-md bg-dark-blue text-white shadow-sm focus:ring-secondary-500 focus:border-secondary-500"
                  placeholder="Enter your username"
                />
              </div>
              <div className="mt-3 bg-primary-800/30 p-3 rounded border border-primary-700">
                <h3 className="text-yellow-300 text-sm font-semibold mb-1">Requirements</h3>
                <ul className="list-disc list-inside text-xs text-gray-300 space-y-1">
                  <li>Enter your <span className="text-white font-medium">username</span> (not email)</li>
                  <li>Your account must have a verified email address</li>
                  <li>Contact support if you need to verify your email address</li>
                </ul>
              </div>
            </div>
            
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none ${
                  isLoading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? 'Sending Code...' : 'Send Reset Code'}
              </button>
            </div>
            
            <div className="text-center mt-4">
              <a href="/" className="text-primary-400 hover:text-secondary-500 font-medium text-sm">
                Back to Login
              </a>
            </div>
          </form>
        ) : (
          // Enter Code and New Password Form
          <form onSubmit={handleConfirmReset} className="mt-8 space-y-6 bg-dark-blue-light p-8 rounded-lg shadow-lg border border-primary-700">
            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-gray-200">
                Username
              </label>
              <div className="mt-1 relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <FaUser />
                </span>
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="pl-10 block w-full border-primary-700 rounded-md bg-dark-blue text-white shadow-sm focus:ring-secondary-500 focus:border-secondary-500"
                  placeholder="Enter your username"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="resetCode" className="block text-sm font-medium text-gray-200">
                Verification Code
              </label>
              <div className="mt-1 relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <FaKey />
                </span>
                <input
                  id="resetCode"
                  name="resetCode"
                  type="text"
                  required
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  className="pl-10 block w-full border-primary-700 rounded-md bg-dark-blue text-white shadow-sm focus:ring-secondary-500 focus:border-secondary-500"
                  placeholder="Enter the code from your email"
                />
                <p className="mt-1 text-xs text-gray-400">Check your email for the verification code</p>
              </div>
            </div>
            
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-200">
                New Password
              </label>
              <div className="mt-1 relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <FaLock />
                </span>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10 block w-full border-primary-700 rounded-md bg-dark-blue text-white shadow-sm focus:ring-secondary-500 focus:border-secondary-500"
                  placeholder="Enter new password"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-200">
                Confirm Password
              </label>
              <div className="mt-1 relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <FaLock />
                </span>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 block w-full border-primary-700 rounded-md bg-dark-blue text-white shadow-sm focus:ring-secondary-500 focus:border-secondary-500"
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none ${
                  isLoading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? 'Resetting Password...' : 'Reset Password'}
              </button>
            </div>
            
            <div className="flex justify-between text-center mt-4">
              <button 
                type="button" 
                onClick={() => setShowCodeForm(false)}
                className="text-primary-400 hover:text-secondary-500 font-medium text-sm"
              >
                Request New Code
              </button>
              <a href="/" className="text-primary-400 hover:text-secondary-500 font-medium text-sm">
                Back to Login
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
} 