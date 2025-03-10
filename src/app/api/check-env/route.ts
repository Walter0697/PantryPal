import { NextResponse } from 'next/server';

// This route helps check if environment variables are properly loaded
// It's recommended to delete this file or protect it before deploying to production
export async function GET() {
  // Mask sensitive values for security
  const maskValue = (value?: string): string => {
    if (!value) return 'Not set';
    if (value.includes('your-')) return `Invalid placeholder: ${value}`;
    return value.substring(0, 4) + '...' + value.substring(value.length - 4);
  };

  // Check AWS and Cognito environment variables
  const envCheck = {
    aws_region: process.env.AWS_REGION || 'Not set',
    aws_access_key_id: maskValue(process.env.AWS_ACCESS_KEY_ID),
    aws_secret_access_key: maskValue(process.env.AWS_SECRET_ACCESS_KEY),
    cognito_user_pool_id: process.env.COGNITO_USER_POOL_ID || 'Not set',
    cognito_client_id: process.env.COGNITO_CLIENT_ID || 'Not set',
    client_id_valid_format: process.env.COGNITO_CLIENT_ID ? 
      /^[\w+]+$/.test(process.env.COGNITO_CLIENT_ID) : false,
    env_file_used: '.env file exists: ' + (process.env.NEXT_PUBLIC_ENV_TEST ? 'Yes' : 'No'),
  };

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    message: 'Environment variable check',
    env_check: envCheck,
  });
} 