let inMemoryBearerToken: string | null = null;

export function setAuthToken(token: string | null): void {
  inMemoryBearerToken = token;
}

export function getAuthToken(): string | null {
  return inMemoryBearerToken;
}

export async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (inMemoryBearerToken) {
    headers.set('Authorization', `Bearer ${inMemoryBearerToken}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error || `Request failed with status ${response.status}`) as Error & {
      status?: number;
      code?: string;
    };
    error.status = response.status;
    throw error;
  }
  return payload as T;
}
