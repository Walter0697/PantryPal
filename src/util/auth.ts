import { jwtDecode } from 'jwt-decode';

interface DecodedToken {
  username: string;
  exp?: number;
  [key: string]: any;
}

// Saves the JWT token to local storage
export function saveToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('jwtToken', token);
  }
}

// Retrieves the JWT token from local storage
export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('jwtToken');
  }
  return null;
}

// Removes the JWT token from local storage
export function removeToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('jwtToken');
  }
}

// Checks if the token is valid and not expired
export function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  
  try {
    const decoded = jwtDecode<DecodedToken>(token);
    const currentTime = Date.now() / 1000; // convert to seconds
    
    // Check if token has expiration and if it's valid
    if (!decoded.exp) return false;
    return decoded.exp > currentTime;
  } catch (error) {
    return false;
  }
}

// Decodes the token and returns the user information
export function getUserFromToken(token: string | null): DecodedToken | null {
  if (!token) return null;
  
  try {
    return jwtDecode<DecodedToken>(token);
  } catch (error) {
    return null;
  }
}

// Gets the remaining valid time in seconds
export function getTokenRemainingTime(token: string | null): number {
  if (!token) return 0;
  
  try {
    const decoded = jwtDecode<DecodedToken>(token);
    if (!decoded.exp) return 0;
    
    const currentTime = Date.now() / 1000; // convert to seconds
    const remainingTime = decoded.exp - currentTime;
    
    return remainingTime > 0 ? Math.floor(remainingTime) : 0;
  } catch (error) {
    return 0;
  }
} 