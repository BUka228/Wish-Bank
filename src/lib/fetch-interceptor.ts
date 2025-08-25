// Global fetch interceptor for automatic authentication
let originalFetch: typeof fetch | undefined;

export function setupFetchInterceptor() {
  if (typeof window === 'undefined' || originalFetch) {
    return; // Already setup or not in browser
  }

  originalFetch = window.fetch;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    // Only intercept API calls to our own endpoints
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    
    if (url.startsWith('/api/') || url.includes('/api/')) {
      const headers = new Headers(init?.headers);
      
      // Add Content-Type if not present and we have a body
      if (init?.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      
      // Add Authorization header if available and not already present
      if (!headers.has('Authorization') && window.Telegram?.WebApp?.initData) {
        headers.set('Authorization', `Bearer ${window.Telegram.WebApp.initData}`);
      }
      
      // Create new init object with updated headers
      const newInit: RequestInit = {
        ...init,
        headers: headers,
      };
      
      return originalFetch!(input, newInit);
    }
    
    // For non-API calls, use original fetch
    return originalFetch!(input, init);
  };
}

export function restoreFetch() {
  if (typeof window !== 'undefined' && originalFetch) {
    window.fetch = originalFetch;
  }
}