'use server';

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
    // For simplicity, we'll just return success
    // In a real app, you would set a secure cookie or use a session management system
    return { success: true, message: 'Login successful' };
  }

  // Authentication failed
  return { success: false, message: 'Invalid username or password' };
}
