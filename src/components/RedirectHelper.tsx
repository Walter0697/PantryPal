'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface RedirectHelperProps {
  to: string;
}

/**
 * A simple component that redirects to the specified path
 */
export default function RedirectHelper({ to }: RedirectHelperProps) {
  const router = useRouter();
  
  useEffect(() => {
    router.push(to);
  }, [router, to]);
  
  return null;
} 