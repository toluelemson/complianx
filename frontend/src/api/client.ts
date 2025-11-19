import axios from 'axios';

const nodeEnv =
  typeof globalThis !== 'undefined' && (globalThis as any)?.process?.env
    ? (globalThis as any).process.env
    : undefined;

const baseURL =
  (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_API_URL) ||
  nodeEnv?.VITE_API_URL ||
  'http://localhost:3000';

const api = axios.create({
  baseURL,
});

export function setAuthToken(token?: string) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

export default api;

// Global PAYWALL interceptor -> dispatch event for UI
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const data = error?.response?.data;
    if (data && (data.code === 'PAYWALL' || data?.message?.code === 'PAYWALL')) {
      try {
        const detail = typeof data === 'object' ? data : { message: 'PAYWALL' };
        window.dispatchEvent(new CustomEvent('paywall', { detail }));
      } catch (dispatchError) {
        console.error('Failed to dispatch paywall event', dispatchError);
      }
    }
    return Promise.reject(error);
  },
);
