import AsyncStorage from '@react-native-async-storage/async-storage';

// Change this to your Render URL once deployed. For local dev, use your machine's WiFi IP.
export const BASE_URL = 'https://smartcare-backend-8s0k.onrender.com/api';

async function getToken() {
  return AsyncStorage.getItem('auth_token');
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  requireAuth = true
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (requireAuth) {
    const token = await getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { code: data.code });
  return data as T;
}

export const api = {
  get: <T>(path: string, auth = true) => request<T>('GET', path, undefined, auth),
  post: <T>(path: string, body: unknown, auth = true) => request<T>('POST', path, body, auth),
  put: <T>(path: string, body: unknown, auth = true) => request<T>('PUT', path, body, auth),
  delete: <T>(path: string, auth = true) => request<T>('DELETE', path, undefined, auth),
};
