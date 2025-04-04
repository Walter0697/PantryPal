import { NextRequest, NextResponse } from "next/server";
import { jwtDecode } from 'jwt-decode';

// List of public paths that don't require authentication
const PUBLIC_FILE_PATHS = ['/_next', '/favicon.ico', '/images', '/public', '/assets'];
const PUBLIC_ROUTES = ['/', '/api', '/change-password', '/login', '/reset-password'];

// Function to check if a path is public
function isPublicPath(path: string): boolean {
  // Check for file paths first (static assets)
  const isStaticAsset = PUBLIC_FILE_PATHS.some(prefix => path.startsWith(prefix));
  if (isStaticAsset) return true;
  
  // Check for exact route matches or routes that start with a public prefix
  return PUBLIC_ROUTES.some(route => 
    path === route || 
    path.startsWith(`${route}/`)
  );
}

// Protected routes that require authentication
const PROTECTED_ROUTES = ['/home'];

// Special handing for protected pages - common redirection destinations
function isProtectedPath(path: string): boolean {
  return PROTECTED_ROUTES.some(route => 
    path === route || 
    path.startsWith(`${route}/`)
  );
}

// More robust token validation
function isTokenValid(token: string): boolean {
  if (!token) return false;
  
  try {
    // Decode the token
    const decoded = jwtDecode<{ exp?: number; sub?: string }>(token);
    
    // Check if token has required claims
    if (!decoded.exp || !decoded.sub) {
      console.log('Token missing required claims (exp or sub)');
      return false;
    }
    
    // Check if token is expired
    const currentTime = Date.now() / 1000; // convert to seconds
    if (decoded.exp < currentTime) {
      console.log(`Token expired at ${new Date(decoded.exp * 1000).toISOString()}, current time: ${new Date(currentTime * 1000).toISOString()}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.log('Error decoding token:', error);
    return false;
  }
}

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Only run on client-side pages
  const url = request.nextUrl.pathname;
  if (url.startsWith('/_next') || url.startsWith('/api')) {
    return response;
  }
  
  // Check for JWT in headers
  const authHeader = request.headers.get('x-auth-token');
  if (authHeader) {
    // If a client is sending a custom auth header, use it to set the cookie
    response.cookies.set('jwtToken', authHeader, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
  }
  
  // Get the pathname of the request
  const path = request.nextUrl.pathname;
  
  console.log(`Middleware processing path: ${path}, full URL: ${url}`);
  
  // Skip token verification for public paths
  if (isPublicPath(path)) {
    console.log(`Public path detected: ${path}, allowing access`);
    return response;
  }
  
  // CRITICAL: Read token from both cookie and localStorage
  // In Next.js, cookies are accessible to middleware, but localStorage is not
  const jwtCookie = request.cookies.get('jwtToken');
  const token = jwtCookie?.value || 
                request.headers.get('Authorization')?.replace('Bearer ', '');
  
  // Detailed token logging
  if (token) {
    console.log(`Token found in cookies, length: ${token.length}, first 10 chars: ${token.substring(0, 10)}...`);
  } else {
    console.log('No token found in cookies - middleware cannot access localStorage, only cookies!');
  }
  
  // Special handling for protected routes - common redirection destinations
  const isProtected = isProtectedPath(path);
  
  // If no token found or token is invalid, redirect to login page
  if (!token || !isTokenValid(token)) {
    console.log(`Invalid or missing token for path: ${path}, redirecting to login`);
    
    // Create the URL for the login page
    const loginUrl = new URL('/', request.url);
    
    // Add a return_url parameter to redirect back after login
    loginUrl.searchParams.set('returnUrl', path);
    
    // Special handling for protected routes to aid debugging
    if (isProtected) {
      console.log(`Protected path detected with invalid token, adding debug info`);
      loginUrl.searchParams.set('reason', 'invalid_token_for_protected_route');
      loginUrl.searchParams.set('timestamp', Date.now().toString());
    }
    
    // Redirect to login
    console.log(`Redirecting to: ${loginUrl.toString()}`);
    return NextResponse.redirect(loginUrl);
  }
  
  // Add the authorization header to the request for downstream usage
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('Authorization', `Bearer ${token}`);
  
  // If token is valid, continue the request
  console.log(`Valid token for path: ${path}, proceeding with authenticated request`);
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    // Match all routes except static files, API routes and other public paths
    '/((?!_next|public|favicon\\.ico|manifest\\.json|.*\\.(?:jpg|jpeg|gif|png|ico|svg|webp|js|css)).*)',
  ],
};
