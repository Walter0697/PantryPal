# JWT Authentication Implementation

This document explains how the JWT (JSON Web Token) authentication system is implemented in the PantryPal application.

## Overview

The application uses JWT tokens for authentication with the following features:
- Secure token-based authentication
- Token expiration handling
- Automatic redirection to login page for expired tokens
- Redirect back to the original page after login
- Protection for all non-public routes

## Implementation Components

### 1. Server-Side Authentication (actions.ts)

The server generates JWT tokens upon successful authentication:
- Tokens include the username and expiration time
- Tokens are signed with a secret key
- Tokens are returned to the client along with expiration information

### 2. Client-Side Token Management (AuthProvider.tsx)

The AuthProvider component manages authentication state:
- Stores and retrieves tokens from localStorage
- Checks token validity on application load
- Provides login and logout functionality
- Handles token expiration via a timer
- Exposes authentication context to the application

### 3. Route Protection (middleware.ts)

The Next.js middleware protects routes by:
- Intercepting all non-public requests
- Verifying token presence and validity
- Redirecting to login page with return URL if authentication fails
- Adding Authorization header for authenticated requests

### 4. Token Utilities (auth.ts)

Helper functions for token management:
- Token storage and retrieval
- Token validation
- Token decoding
- Remaining token lifetime calculation

## Authentication Flow

1. User logs in with credentials
2. Server validates credentials and returns a JWT token
3. Client stores the token in localStorage
4. AuthProvider sets up expiration monitoring
5. Protected routes check token validity via middleware
6. When the token expires, the user is redirected to login

## Security Considerations

- Tokens are stored in localStorage (Note: for higher security, consider using cookies with HttpOnly flag)
- JWT Secret should be stored in environment variables in production
- Token expiration is enforced both client-side and server-side
- Public routes are explicitly defined to prevent unintended protection

## API Security

All API routes should implement their own token validation to ensure proper authorization. 