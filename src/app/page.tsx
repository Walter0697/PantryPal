'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaUser, FaLock, FaUtensils, FaEnvelope, FaKey } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { authenticate, completeNewPassword, forgotPassword, confirmForgotPassword } from './actions';
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
  
  // For forgot password flow
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordIdentifier, setForgotPasswordIdentifier] = useState('');
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');

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
    
    try {
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
            
            try {
              // Let the AuthProvider handle the token
              login(result.token, result.expiresIn);
              
              // Use a short timeout to ensure the token is set before redirecting
              console.log('Setting up redirection with delay...');
              
              // IMPORTANT: Instead of relying only on router.push, use a direct navigation approach
              const targetUrl = returnUrl || '/home';
              
              // Force a clean navigation state
              setTimeout(() => {
                try {
                  console.log('Executing redirection to:', targetUrl);
                  
                  // Use window.location for a hard navigation
                  window.location.href = targetUrl;
                } catch (navError) {
                  toast.error('Error during navigation. Please try again.');
                  console.log('Navigation error:', navError);
                }
              }, 200);
            } catch (loginError) {
              toast.error('Error storing authentication data. Please try again.');
              console.log('Login token storage error:', loginError);
            }
          } else {
            toast.error('Authentication failed: Missing token information');
            console.log('Login response missing token or expiration:', result);
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
          console.log('Login failed:', result);
        }
      } catch (authError: any) {
        // Specific error for authentication issues
        toast.error(`Authentication error: ${authError.message || 'Please check your credentials'}`);
        console.log('Authentication error:', authError);
      }
    } catch (error: any) {
      // Fallback error handler for any unexpected issues
      toast.error(`Login error: ${error.message || 'Please try again'}`);
      console.log('Unexpected login error:', error);
    } finally {
      setIsLoading(false);
    }
  }
  
  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    
    try {
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
        // Note: No longer passing email parameter
        const result = await completeNewPassword(username, newPassword, sessionToken);
        
        if (result.success) {
          // Success message
          toast.success(result.message || 'Password changed successfully!');
          
          // If we got a token back, use it to log in
          if (result.token && result.expiresIn) {
            try {
              login(result.token, result.expiresIn);
              // Redirect to the return URL or home
              console.log(`Redirecting to ${returnUrl} after password change`);
              
              try {
                router.push(returnUrl || '/home');
              } catch (routerError) {
                // If router.push fails, use window.location as fallback
                console.log('Router navigation failed, using fallback method');
                window.location.href = returnUrl || '/home';
              }
            } catch (loginError) {
              toast.error('Error storing authentication data. Please try again.');
              console.log('Login token storage error:', loginError);
              // Reset to login form as fallback
              setShowPasswordChange(false);
            }
          } else {
            // Reset the form and show login form to log in again
            setShowPasswordChange(false);
            setPassword(''); // Clear the password field
            toast.success('Please log in with your new password');
            
            // Focus on the password field for better UX
            setTimeout(() => {
              try {
                const passwordField = document.getElementById('password');
                if (passwordField) {
                  passwordField.focus();
                }
              } catch (focusError) {
                console.log('Focus error:', focusError);
              }
            }, 100);
          }
        } else {
          // More detailed error message
          toast.error(`Password change failed: ${result.message}`);
          console.log('Password change error details:', result);
        }
      } catch (passwordChangeError: any) {
        toast.error(`Password change error: ${passwordChangeError.message || 'Please try again'}`);
        console.log('Password change error:', passwordChangeError);
      }
    } catch (error: any) {
      toast.error(`Unexpected error: ${error.message || 'Please try again'}`);
      console.log('Password change exception:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      if (!forgotPasswordIdentifier.trim()) {
        toast.error('Please enter your username');
        return;
      }
      
      setIsLoading(true);
      
      try {
        // Use whatever the user entered
        const result = await forgotPassword(forgotPasswordIdentifier);
        
        if (result.success) {
          toast.success(result.message);
          // Show the confirm reset form
          setShowConfirmReset(true);
        } else {
          toast.error(result.message);
        }
      } catch (apiError: any) {
        toast.error(`Password reset error: ${apiError.message || 'Please try again later'}`);
        console.log('Forgot password API error:', apiError);
      }
    } catch (error: any) {
      toast.error(`An unexpected error occurred: ${error.message || 'Please try again'}`);
      console.log('Forgot password general error:', error);
    } finally {
      setIsLoading(false);
    }
  }
  
  async function handleConfirmReset(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      if (!resetCode.trim()) {
        toast.error('Please enter the confirmation code from your email');
        return;
      }
      
      if (resetPassword !== confirmResetPassword) {
        toast.error('Passwords do not match');
        return;
      }
      
      if (resetPassword.length < 8) {
        toast.error('Password must be at least 8 characters long');
        return;
      }
      
      setIsLoading(true);
      
      try {
        const result = await confirmForgotPassword(
          forgotPasswordIdentifier,  // Use the identifier provided
          resetCode,
          resetPassword
        );
        
        if (result.success) {
          toast.success(result.message);
          try {
            // Go back to login
            setShowForgotPassword(false);
            setShowConfirmReset(false);
            // Pre-fill the username field if it makes sense
            setUsername(forgotPasswordIdentifier);
            // Clear sensitive data
            setResetCode('');
            setResetPassword('');
            setConfirmResetPassword('');
          } catch (stateError) {
            toast.error('Error updating the form. Please try logging in again.');
            console.log('State update error:', stateError);
          }
        } else {
          toast.error(result.message);
        }
      } catch (apiError: any) {
        toast.error(`Password reset error: ${apiError.message || 'Please check your code and try again'}`);
        console.log('Reset confirmation API error:', apiError);
      }
    } catch (error: any) {
      toast.error(`An unexpected error occurred: ${error.message || 'Please try again'}`);
      console.log('Reset confirmation general error:', error);
    } finally {
      setIsLoading(false);
    }
  }
  
  function switchToForgotPassword() {
    setShowForgotPassword(true);
    // Pre-fill the forgot password field with username
    if (username) {
      setForgotPasswordIdentifier(username);
    }
  }
  
  function backToLogin() {
    setShowForgotPassword(false);
    setShowConfirmReset(false);
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
            {showPasswordChange ? 'Change Your Password' : showForgotPassword ? 'Reset Password' : 'Welcome to PantryPal'}
          </h1>
          {!showPasswordChange && !showForgotPassword && (
            <p className="text-gray-300 mt-2">Your kitchen inventory management solution</p>
          )}
          {showPasswordChange && (
            <p className="text-gray-300 mt-2">You need to set a new password before you can login</p>
          )}
          {showForgotPassword && !showConfirmReset && (
            <p className="text-gray-300 mt-2">Enter your username to receive a reset code</p>
          )}
          {showForgotPassword && showConfirmReset && (
            <p className="text-gray-300 mt-2">Enter the verification code from your email</p>
          )}
        </div>
        
        {!showPasswordChange && !showForgotPassword && (
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

            <div className="flex flex-col space-y-4">
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full bg-dark-blue hover:bg-dark-blue-light text-white font-medium py-3 px-4 rounded-md shadow-md border border-primary-600 transition duration-300 ease-in-out ${
                  isLoading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </button>
              
              <button
                type="button"
                onClick={switchToForgotPassword}
                className="w-full bg-transparent text-primary-400 hover:text-secondary-500 font-medium py-2 transition duration-300 ease-in-out"
              >
                Forgot Password?
              </button>
            </div>
            
            <div className="mt-6 text-center">
              <p className="text-gray-400 text-sm">
                Track your kitchen inventory, create shopping lists, and never run out of essential ingredients again.
              </p>
            </div>
          </form>
        )}
        
        {showPasswordChange && (
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
              <p className="mt-1 text-xs text-primary-400">
                Your email will be automatically verified when you change your password.
              </p>
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
                  placeholder="Enter new password"
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
                  placeholder="Confirm new password"
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
        
        {showForgotPassword && !showConfirmReset && (
          // Forgot Password Form
          <form onSubmit={handleForgotPassword} className="bg-dark-blue-light border border-primary-700 shadow-xl rounded-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white">Reset Password</h1>
              <p className="text-primary-300 mt-2">Enter your username to receive a reset code</p>
            </div>
            
            <div className="mb-6">
              <label htmlFor="forgotPasswordIdentifier" className="block text-gray-200 text-sm font-medium mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaUser className="text-primary-400" />
                </div>
                <input
                  id="forgotPasswordIdentifier"
                  type="text"
                  value={forgotPasswordIdentifier}
                  onChange={(e) => setForgotPasswordIdentifier(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full pl-10 pr-3 py-2 bg-dark-blue border border-primary-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="mt-2 text-xs text-gray-400">
                <p>You must have a verified email address to reset your password.</p>
                <p className="mt-1">If you get an error, go to Profile to add your email first.</p>
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
                {isLoading ? 'Sending Code...' : 'Send Reset Code'}
              </button>
              
              <button
                type="button"
                onClick={backToLogin}
                className="w-full bg-transparent text-primary-400 hover:text-secondary-500 font-medium py-2 transition duration-300 ease-in-out"
              >
                Back to Login
              </button>
            </div>
          </form>
        )}
        
        {showForgotPassword && showConfirmReset && (
          // Confirm Reset Form
          <form onSubmit={handleConfirmReset} className="bg-dark-blue-light border border-primary-700 shadow-xl rounded-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white">Reset Password</h1>
              <p className="text-primary-300 mt-2">Enter the verification code from your email</p>
            </div>
            
            <div className="mb-6">
              <label htmlFor="resetCode" className="block text-gray-200 text-sm font-medium mb-2">
                Verification Code
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaKey className="text-primary-400" />
                </div>
                <input
                  id="resetCode"
                  type="text"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  placeholder="Enter code from email"
                  className="w-full pl-10 pr-3 py-2 bg-dark-blue border border-primary-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
            
            <div className="mb-6">
              <label htmlFor="resetPassword" className="block text-gray-200 text-sm font-medium mb-2">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="text-primary-400" />
                </div>
                <input
                  id="resetPassword"
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full pl-10 pr-3 py-2 bg-dark-blue border border-primary-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
            
            <div className="mb-6">
              <label htmlFor="confirmResetPassword" className="block text-gray-200 text-sm font-medium mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="text-primary-400" />
                </div>
                <input
                  id="confirmResetPassword"
                  type="password"
                  value={confirmResetPassword}
                  onChange={(e) => setConfirmResetPassword(e.target.value)}
                  placeholder="Confirm new password"
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
                {isLoading ? 'Resetting Password...' : 'Reset Password'}
              </button>
              
              <button
                type="button"
                onClick={backToLogin}
                className="w-full bg-transparent text-primary-400 hover:text-secondary-500 font-medium py-2 transition duration-300 ease-in-out"
              >
                Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
