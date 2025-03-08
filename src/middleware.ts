import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtDecode } from 'jwt-decode';

// List of public paths that don't require authentication
const PUBLIC_PATHS = ['/', '/api', '/_next', '/favicon.ico'];

// Function to check if a path is public
function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some(publicPath => path === publicPath || path.startsWith(publicPath));
}

// Function to check if token is expired
function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwtDecode<{ exp?: number }>(token);
    if (!decoded.exp) return true;
    
    const currentTime = Date.now() / 1000; // convert to seconds
    return decoded.exp < currentTime;
  } catch (error) {
    // Invalid token
    return true;
  }
}

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;
  
  // Skip token verification for public paths
  if (isPublicPath(path)) {
    return NextResponse.next();
  }
  
  // Check for token in cookies or headers
  const token = request.cookies.get('jwtToken')?.value || 
                request.headers.get('Authorization')?.replace('Bearer ', '');
  
  // If no token found or token is expired, redirect to login page
  if (!token || isTokenExpired(token)) {
    // Create the URL for the login page
    const loginUrl = new URL('/', request.url);
    
    // Add a return_url parameter to redirect back after login
    loginUrl.searchParams.set('returnUrl', path);
    
    // Redirect to login
    return NextResponse.redirect(loginUrl);
  }
  
  // Add the authorization header to the request for downstream usage
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('Authorization', `Bearer ${token}`);
  
  // If token is valid, continue the request
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    // Match all routes except static files, etc.
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
