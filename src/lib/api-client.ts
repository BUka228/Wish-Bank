// API client with Telegram WebApp authentication
export class ApiClient {
  private static getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // In production, add Telegram WebApp init data as Bearer token
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) {
      headers['Authorization'] = `Bearer ${window.Telegram.WebApp.initData}`;
    } else if (typeof window !== 'undefined') {
      // For development/testing, we can skip auth header since server has fallback
      console.log('No Telegram WebApp data available, using fallback auth');
    }

    return headers;
  }

  static async get(url: string): Promise<Response> {
    return fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
  }

  static async post(url: string, data?: any): Promise<Response> {
    return fetch(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  static async put(url: string, data?: any): Promise<Response> {
    return fetch(url, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  static async delete(url: string): Promise<Response> {
    return fetch(url, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
  }
}

// Legacy function for backward compatibility
export async function apiCall(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add auth header if available
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) {
    headers['Authorization'] = `Bearer ${window.Telegram.WebApp.initData}`;
  }

  return fetch(url, {
    ...options,
    headers,
  });
}