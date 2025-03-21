'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaUser, FaLock, FaEnvelope, FaKey } from 'react-icons/fa';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { authenticate, completeNewPassword, forgotPassword, confirmForgotPassword } from './actions';
import { useAuth } from '../components/AuthProvider';
import RedirectHelper from '../components/RedirectHelper';
import PasswordInput from '../components/PasswordInput';
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3';

// Add at the top of the file, after imports
declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      enterprise?: unknown;
    };
  }
}

// Wrap the LoginPage with the GoogleReCaptchaProvider
function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [returnUrl, setReturnUrl] = useState('/home');
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [recaptchaFailed, setRecaptchaFailed] = useState(false);
  
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
    
    try {
      setIsLoading(true);
      
      // Only attempt reCAPTCHA if not in fallback mode
      let recaptchaToken = null;
      
      // Wrap reCAPTCHA execution in a try-catch to handle potential hpm errors
      if (!recaptchaFailed && executeRecaptcha) {
        // Create a promise with timeout for reCAPTCHA
        const getRecaptchaToken = async (): Promise<string | null> => {
          try {
            // Wait for reCAPTCHA to be fully ready
            if (!(window as any).__RECAPTCHA_READY) {
              // Wait up to 5 seconds for reCAPTCHA to be ready
              for (let i = 0; i < 10; i++) {
                if ((window as any).__RECAPTCHA_READY) {
                  break;
                }
                await new Promise(resolve => setTimeout(resolve, 500));
              }
              
              if (!(window as any).__RECAPTCHA_READY) {
                return null;
              }
            }
            
            // Enhanced pre-check for reCAPTCHA
            const preCheckRecaptcha = async (): Promise<boolean> => {
              // Check if grecaptcha object is properly loaded
              if (typeof window === 'undefined' || 
                  !window.grecaptcha || 
                  typeof window.grecaptcha.ready !== 'function') {
                
                // Try to reload the script
                const existingScript = document.getElementById('recaptcha-script');
                if (existingScript) {
                  existingScript.remove();
                }
                
                // Wait for a moment before checking again
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                // Final check after attempted reload
                if (typeof window !== 'undefined' && 
                    window.grecaptcha && 
                    typeof window.grecaptcha.ready === 'function') {
                  return true;
                }
                
                return false;
              }
              
              return true;
            };
            
            // Run the pre-check
            const recaptchaAvailable = await preCheckRecaptcha();
            if (!recaptchaAvailable) {
              return null;
            }
            
            // Set a timeout for the recaptcha execution
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('reCAPTCHA timed out')), 10000);
            });
            
            // Ensure reCAPTCHA is ready before execution
            await new Promise<void>(resolve => {
              if (typeof window !== 'undefined' && window.grecaptcha) {
                window.grecaptcha.ready(() => {
                  resolve();
                });
              } else {
                resolve();
              }
            });
            
            // Race between timeout and recaptcha execution
            const token = await Promise.race([
              new Promise(async (resolve) => {
                try {
                  if (!executeRecaptcha) {
                    resolve(null);
                    return;
                  }
                  
                  // Add additional error handling around executeRecaptcha
                  const result = await executeRecaptcha('login');
                  
                  // Explicitly check for empty or invalid tokens
                  if (!result || typeof result !== 'string' || result.trim() === '') {
                    resolve(null);
                    return;
                  }
                  
                  resolve(result);
                } catch (err) {
                  resolve(null);
                }
              }),
              timeoutPromise
            ]) as string;
            
            // Add additional validation for token format
            if (!token) {
              return null;
            }
            
            // Check token length for basic validation
            if (token.length < 20) {
              return null;
            }
            
            return token;
          } catch (error) {
            // Catch any errors from the reCAPTCHA execution
            return null;
          }
        };
        
        // Try to get token with retry
        let attempts = 0;
        const maxAttempts = 2;
        
        while (!recaptchaToken && attempts < maxAttempts) {
          attempts++;
          recaptchaToken = await getRecaptchaToken();
          
          if (!recaptchaToken && attempts < maxAttempts) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        if (!recaptchaToken) {
          setRecaptchaFailed(true);
          // Use a fallback "token" that the server will recognize as fallback mode
          recaptchaToken = 'FALLBACK_MODE';
        }
      } else {
        // We're in fallback mode or reCAPTCHA is not available
        recaptchaToken = 'FALLBACK_MODE';
      }
      
      try {
        // Create formData from the state values
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);
        formData.append('recaptchaToken', recaptchaToken);
        
        // Call the server action
        const result = await authenticate(formData);
        
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
        }
        else {
          // Show error toast on failed login
          toast.error(result.message || 'Login failed');
        }
      } catch (authError: any) {
        // Specific error for authentication issues
        toast.error(`Authentication error: ${authError.message || 'Please check your credentials'}`);
      }
    } catch (error: any) {
      // Fallback error handler for any unexpected issues
      toast.error(`Login error: ${error.message || 'Please try again'}`);
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
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image
              src="/assets/pp.png"
              alt="PantryPal Logo"
              width={80}
              height={80}
              className="rounded-md"
            />
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
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="password" className="block text-gray-200 text-sm font-medium mb-2">
                Password
              </label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required={true}
                autoComplete="current-password"
                labelClassName="block text-gray-200 text-sm font-medium mb-2"
                inputClassName="bg-dark-blue border border-primary-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
                iconClassName="text-primary-400"
                toggleClassName="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-primary-400 hover:text-secondary-500"
                disabled={isLoading}
              />
            </div>

            <div className="flex flex-col space-y-4">
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full bg-dark-blue hover:bg-dark-blue-light text-white font-medium py-3 px-4 rounded-md shadow-md border border-primary-600 transition duration-300 ease-in-out ${
                  isLoading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? 'Signing in...' : 'Login'}
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
              <p className="text-xs text-gray-400 mt-2">
                {recaptchaFailed ? 
                  'Security verification in fallback mode' : 
                  'Protected by reCAPTCHA v3'}
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
              <PasswordInput
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required={true}
                autoComplete="new-password"
                labelClassName="block text-gray-200 text-sm font-medium mb-2"
                inputClassName="bg-dark-blue border border-primary-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
                iconClassName="text-primary-400"
                toggleClassName="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-primary-400 hover:text-secondary-500"
                disabled={isLoading}
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="confirmPassword" className="block text-gray-200 text-sm font-medium mb-2">
                Confirm Password
              </label>
              <PasswordInput
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required={true}
                autoComplete="new-password"
                labelClassName="block text-gray-200 text-sm font-medium mb-2"
                inputClassName="bg-dark-blue border border-primary-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
                iconClassName="text-primary-400"
                toggleClassName="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-primary-400 hover:text-secondary-500"
                disabled={isLoading}
              />
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
                  disabled={isLoading}
                />
              </div>
              <div className="mt-2 text-xs text-gray-400">
                <p>You must have a verified email address to reset your password.</p>
                <p className="mt-1">Contact support if you need to verify your email address.</p>
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
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <div className="mb-6">
              <label htmlFor="resetPassword" className="block text-gray-200 text-sm font-medium mb-2">
                New Password
              </label>
              <PasswordInput
                id="resetPassword"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Enter new password"
                required={true}
                autoComplete="new-password"
                labelClassName="block text-gray-200 text-sm font-medium mb-2"
                inputClassName="bg-dark-blue border border-primary-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
                iconClassName="text-primary-400"
                toggleClassName="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-primary-400 hover:text-secondary-500"
                disabled={isLoading}
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="confirmResetPassword" className="block text-gray-200 text-sm font-medium mb-2">
                Confirm Password
              </label>
              <PasswordInput
                id="confirmResetPassword"
                value={confirmResetPassword}
                onChange={(e) => setConfirmResetPassword(e.target.value)}
                placeholder="Confirm new password"
                required={true}
                autoComplete="new-password"
                labelClassName="block text-gray-200 text-sm font-medium mb-2"
                inputClassName="bg-dark-blue border border-primary-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
                iconClassName="text-primary-400"
                toggleClassName="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-primary-400 hover:text-secondary-500"
                disabled={isLoading}
              />
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

// Wrapper component with reCAPTCHA provider
export default function LoginPage() {
  const [recaptchaError, setRecaptchaError] = useState<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';
  
  // Log critical configuration errors only (not debug logs)
  useEffect(() => {
    if (!siteKey) {
      setRecaptchaError('reCAPTCHA site key missing - check .env file');
    } else if (siteKey === 'your-recaptcha-v3-site-key') {
      setRecaptchaError('Using placeholder reCAPTCHA key - set actual key in .env');
    }
    
    // Check if Google's reCAPTCHA services are reachable
    const checkGoogleServices = async () => {
      try {
        await fetch('https://www.google.com/recaptcha/api.js', { 
          method: 'HEAD',
          mode: 'no-cors'
        });
      } catch (error) {
        setRecaptchaError('Cannot reach reCAPTCHA services - check network');
      }
    };
    
    checkGoogleServices();
    
    // Add global error handler to catch and suppress reCAPTCHA related errors
    const originalOnError = window.onerror;
    window.onerror = function(message, source, lineno, colno, error) {
      // Check if the error message contains 'hpm' which is a known issue with reCAPTCHA
      if (typeof message === 'string' && message.includes('hpm')) {
        return true; // Prevent the error from propagating
      }
      
      // Otherwise, use the original error handler
      if (originalOnError) {
        return originalOnError.call(this, message, source, lineno, colno, error);
      }
      return false;
    };
    
    // Cleanup function to restore the original error handler
    return () => {
      window.onerror = originalOnError;
    };
  }, [siteKey]);
  
  // Then add this code to monitor script loading after the GoogleReCaptchaProvider initialization
  useEffect(() => {
    // Check for script loading
    const scriptLoadingCheck = setInterval(() => {
      const recaptchaScript = document.getElementById('recaptcha-script');
      if (recaptchaScript && window.grecaptcha) {
        clearInterval(scriptLoadingCheck);
      }
    }, 1000);

    return () => {
      clearInterval(scriptLoadingCheck);
    };
  }, []);
  
  // Define the global callback for reCAPTCHA loading
  useEffect(() => {
    // Function called when reCAPTCHA is fully loaded
    (window as any).onRecaptchaLoaded = () => {
      // Remove any error message related to reCAPTCHA loading
      if (recaptchaError && recaptchaError.includes('script failed to load')) {
        setRecaptchaError(null);
      }
    };
    
    return () => {
      // Clean up the global function
      (window as any).onRecaptchaLoaded = undefined;
    };
  }, [recaptchaError]);
  
  // Initialize reCAPTCHA loading state
  useEffect(() => {
    // Set a global variable to know if reCAPTCHA script is loading
    (window as any).__RECAPTCHA_LOADING = true;
    
    // Remove any existing script to force a new load
    const oldScript = document.getElementById('recaptcha-script');
    if (oldScript) {
      oldScript.remove();
    }
    
    // Add script load event listener
    const checkRecaptchaLoaded = () => {
      const maxAttempts = 10;
      let attempts = 0;
      
      const checkInterval = setInterval(() => {
        attempts++;
        if (window.grecaptcha && typeof window.grecaptcha.ready === 'function') {
          clearInterval(checkInterval);
          (window as any).__RECAPTCHA_READY = true;
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          setRecaptchaError('reCAPTCHA failed to initialize - please refresh the page');
        }
      }, 1000);
    };
    
    // Start checking after a short delay to allow script injection
    setTimeout(checkRecaptchaLoaded, 2000);
    
    return () => {
      (window as any).__RECAPTCHA_LOADING = false;
    };
  }, []);
  
  return (
    <div>
      {recaptchaError && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center p-2 z-50">
          reCAPTCHA Error: {recaptchaError}
        </div>
      )}
      <GoogleReCaptchaProvider
        reCaptchaKey={siteKey}
        scriptProps={{
          async: true,
          defer: true,
          appendTo: 'head',
          nonce: undefined,
          id: 'recaptcha-script',
        }}
        language="en"
        useEnterprise={false}
        useRecaptchaNet={true}
        container={{
          parameters: {
            badge: 'bottomright',
            theme: 'dark',
          },
        }}
      >
        <LoginPageContent />
      </GoogleReCaptchaProvider>
    </div>
  );
}
