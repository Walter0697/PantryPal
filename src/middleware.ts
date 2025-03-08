import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // We'll handle authentication in the client component
  // This middleware is just a placeholder for a real authentication system
  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/home/:path*'],
};
