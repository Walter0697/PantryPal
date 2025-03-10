'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaUser, FaLock, FaUtensils, FaEnvelope } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { authenticate, completeNewPassword } from './actions';
import { useAuth } from '../components/AuthProvider';
import RedirectHelper from '../components/RedirectHelper';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [returnUrl, setReturnUrl] = useState('/home');
  
  // For normal login
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // For password change challenge
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [sessionToken, setSessionToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Get the return URL from the query parameters if available
  useEffect(() => {
    const urlReturnPath = searchParams.get('returnUrl');
    if (urlReturnPath) {
      setReturnUrl(urlReturnPath);
    }
  }, [searchParams]);

  // Check if user is already logged in
  useEffect(() => {
    // Only run this once on mount
    const token = localStorage.getItem('jwtToken');
    
    if (token) {
      try {
        // Attempt to decode the token to check if it's valid
        const decoded = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        
        if (decoded.exp && decoded.exp > currentTime) {
          console.log('Already logged in, redirecting to home');
          
          // Use router for redirection within app - don't use window.location
          // This keeps the application context and prevents state conflicts
          router.push(returnUrl || '/home');
        }
      } catch (error) {
        // Invalid token format, remove it
        console.error('Error checking existing token:', error);
        localStorage.removeItem('jwtToken');
      }
    }
  }, [router, returnUrl]); // Only include necessary dependencies

  async function handleNormalLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    
    console.log(`Login attempt started for user: ${username}`);
    console.log(`Return URL: ${returnUrl}`);
    
    try {
      // Create formData from the state values
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);
      
      // Call the server action
      console.log('Calling authentication server action...');
      const result = await authenticate(formData);
      console.log('Authentication result received:', { success: result.success, hasToken: !!result.token });
      
      if (result.success) {
        toast.success(result.message || 'Login successful!');
        
        // Store the JWT token and set login state
        if (result.token && result.expiresIn) {
          console.log('Login successful - token received, preparing redirection to:', returnUrl || '/home');
          
          // Let the AuthProvider handle the token
          login(result.token, result.expiresIn);
          
          // Use a short timeout to ensure the token is set before redirecting
          console.log('Setting up redirection with delay...');
          
          // IMPORTANT: Instead of relying only on router.push, use a direct navigation approach
          const targetUrl = returnUrl || '/home';
          
          // Force a clean navigation state
          setTimeout(() => {
            console.log('Executing redirection to:', targetUrl);
            
            // Use window.location for a hard navigation
            window.location.href = targetUrl;
          }, 200);
        } else {
          toast.error('Authentication failed: Missing token information');
          console.error('Login response missing token or expiration:', result);
        }
      } 
      // Handle password change challenge
      else if (result.challengeName === 'NEW_PASSWORD_REQUIRED') {
        toast.success('Please set a new password to continue');
        
        // Show the password change form instead of redirecting
        setShowPasswordChange(true);
        setSessionToken(result.session || '');
        
        // We already have the username from the login form
        console.log('Password change required for user:', username);
        console.log('Session token available:', !!result.session);
      }
      else {
        // Show error toast on failed login
        toast.error(result.message || 'Login failed');
        console.error('Login failed:', result);
      }
    } catch (error: any) {
      toast.error(`An unexpected error occurred: ${error.message || ''}`);
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  }
  
  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }
    
    setIsLoading(true);
    console.log('Submitting password change');
    
    try {
      // Note: No longer passing email parameter
      const result = await completeNewPassword(username, newPassword, sessionToken);
      
      if (result.success) {
        // Success message
        toast.success(result.message || 'Password changed successfully!');
        
        // If we got a token back, use it to log in
        if (result.token && result.expiresIn) {
          login(result.token, result.expiresIn);
          // Redirect to the return URL or home
          console.log(`Redirecting to ${returnUrl} after password change`);
          router.push(returnUrl || '/home');
        } else {
          // Reset the form and show login form to log in again
          setShowPasswordChange(false);
          setPassword(''); // Clear the password field
          toast.success('Please log in with your new password');
          
          // Focus on the password field for better UX
          setTimeout(() => {
            const passwordField = document.getElementById('password');
            if (passwordField) {
              passwordField.focus();
            }
          }, 100);
        }
      } else {
        // More detailed error message
        toast.error(`Password change failed: ${result.message}`);
        console.error('Password change error details:', result);
      }
    } catch (error: any) {
      toast.error(`Unexpected error: ${error.message || 'Unknown error'}`);
      console.error('Password change exception:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex-grow flex flex-col items-center justify-center p-4">
      <RedirectHelper />
      
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <FaUtensils className="text-secondary-500 text-5xl" />
          </div>
          <h1 className="text-3xl font-bold text-white">
            {showPasswordChange ? 'Change Your Password' : 'Welcome to PantryPal'}
          </h1>
          {!showPasswordChange && (
            <p className="text-gray-300 mt-2">Your kitchen inventory management solution</p>
          )}
          {showPasswordChange && (
            <p className="text-gray-300 mt-2">You need to set a new password before you can login</p>
          )}
        </div>
        
        {!showPasswordChange ? (
          // Normal Login Form
          <form onSubmit={handleNormalLogin} className="bg-dark-blue-light border border-primary-700 shadow-xl rounded-lg p-8">
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
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
        ) : (
          // Password Change Form
          <form onSubmit={handlePasswordChange} className="bg-dark-blue-light border border-primary-700 shadow-xl rounded-lg p-8">
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
                  type="text"
                  value={username}
                  disabled
                  className="w-full pl-10 pr-3 py-2 bg-dark-blue border border-primary-700 text-gray-400 rounded-md"
                />
              </div>
            </div>
            
            <div className="mb-6">
              <label htmlFor="newPassword" className="block text-gray-200 text-sm font-medium mb-2">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="text-primary-400" />
                </div>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter your new password"
                  className="w-full pl-10 pr-3 py-2 bg-dark-blue border border-primary-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
            
            <div className="mb-6">
              <label htmlFor="confirmPassword" className="block text-gray-200 text-sm font-medium mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="text-primary-400" />
                </div>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  className="w-full pl-10 pr-3 py-2 bg-dark-blue border border-primary-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col space-y-4">
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full bg-dark-blue hover:bg-dark-blue-light text-white font-medium py-3 px-4 rounded-md shadow-md border border-primary-600 transition duration-300 ease-in-out ${
                  isLoading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? 'Changing Password...' : 'Change Password & Login'}
              </button>
              
              <button
                type="button"
                onClick={() => setShowPasswordChange(false)}
                className="w-full bg-transparent text-primary-400 hover:text-secondary-500 font-medium py-2 transition duration-300 ease-in-out"
              >
                Back to login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
