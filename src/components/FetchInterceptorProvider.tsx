'use client';

import { useEffect } from 'react';
import { setupFetchInterceptor } from '@/lib/fetch-interceptor';

export function FetchInterceptorProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Setup fetch interceptor when component mounts
    setupFetchInterceptor();
  }, []);

  return <>{children}</>;
}