import { NextResponse } from 'next/server';
import { jwtDecode } from 'jwt-decode';

// This route helps check how redirection and token validation are working
// It provides a JSON response with diagnostic information
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || getBearerToken(request);
  
  const diagnostics = {
    timestamp: new Date().toISOString(),
    requestUrl: request.url,
    headers: getHeadersInfo(request),
    tokenInfo: getTokenInfo(token),
    environment: {
      nextRuntime: process.env.NEXT_RUNTIME || 'unknown',
      nodeEnv: process.env.NODE_ENV || 'unknown'
    },
    navigationAndHistory: {
      referrer: request.headers.get('referer') || 'none'
    }
  };
  
  return NextResponse.json({
    success: true,
    message: 'Redirect check endpoint',
    diagnostics
  });
}

function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

function getHeadersInfo(request: Request): Record<string, string> {
  const result: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    // Filter out sensitive headers
    if (!['cookie', 'authorization'].includes(key.toLowerCase())) {
      result[key] = value;
    } else {
      result[key] = '[redacted]';
    }
  });
  return result;
}

function getTokenInfo(token: string | null): any {
  if (!token) {
    return { status: 'missing' };
  }
  
  try {
    // Try to decode and validate the token
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { 
        status: 'invalid',
        error: 'Not a valid JWT format',
        length: token.length 
      };
    }
    
    const payload = JSON.parse(atob(parts[1]));
    const header = JSON.parse(atob(parts[0]));
    
    // Check expiration
    const isExpired = payload.exp && payload.exp * 1000 < Date.now();
    
    return {
      status: isExpired ? 'expired' : 'valid',
      header,
      payload: {
        ...payload,
        // Format expiration as a readable date
        exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
      },
      tokenPreview: `${token.substring(0, 10)}...${token.substring(token.length - 5)}`,
      tokenLength: token.length
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Failed to parse token',
      error: String(error)
    };
  }
} 