'use server';

import jwt from 'jsonwebtoken';

// Secret key for JWT - in production, this should be an environment variable
const JWT_SECRET = 'your-secret-key';

// JWT expiration time (in seconds) - 24 hours
const JWT_EXPIRATION = 24 * 60 * 60;

// This is a server action for authentication
export async function authenticate(formData: FormData) {
  // In a real application, you would validate against a database
  // For now, we're hardcoding the credentials as requested
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  // Simple validation
  if (!username || !password) {
    return { success: false, message: 'Username and password are required' };
  }

  // Check against hardcoded credentials
  if (username === 'test' && password === 'test') {
    // Generate JWT token
    const token = jwt.sign(
      { 
        username,
        // Add any additional user data you want to include in the token
      }, 
      JWT_SECRET, 
      { 
        expiresIn: JWT_EXPIRATION 
      }
    );

    // Return token to client
    return { 
      success: true, 
      message: 'Login successful', 
      token,
      // Include expiration time for client-side reference
      expiresIn: JWT_EXPIRATION
    };
  }

  // Authentication failed
  return { success: false, message: 'Invalid username or password' };
}

// Function to verify a JWT token - can be used by server components/actions
export async function verifyToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { valid: true, decoded };
  } catch (error) {
    return { valid: false, error };
  }
}
