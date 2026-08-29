/**
 * API utility to handle base URL configuration for both local and remote deployments
 */

// Simple runtime API base URL resolution
// Empty string means use current origin (e.g., localhost:3000)
// For Vercel: should be set to backend URL (e.g., https://backend.railway.app)
let API_BASE_URL = '';

export function setApiBaseUrl(url: string): void {
  API_BASE_URL = url;
}

export function getApiBaseUrl(): string {
  // Try to get from global config if available
  const globalConfig = (window as any).__APP_CONFIG__ || {};
  return globalConfig.apiBase || API_BASE_URL;
}

export function apiUrl(endpoint: string): string {
  const base = getApiBaseUrl();
  return `${base}${endpoint}`;
}

export async function apiFetch(endpoint: string, options?: RequestInit): Promise<Response> {
  return fetch(apiUrl(endpoint), options);
}

export async function apiJson<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await apiFetch(endpoint, options);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type');
    if (contentType && !contentType.includes('application/json')) return null;
    return await res.json();
  } catch {
    return null;
  }
}
