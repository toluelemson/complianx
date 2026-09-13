import axios from 'axios';

const DEFAULT_API_BASE_URL = '/api';
const envBaseURL = import.meta.env.VITE_API_URL?.trim();

function normalizeApiBaseUrl(baseUrl?: string) {
  if (!baseUrl || baseUrl.length === 0) {
    return DEFAULT_API_BASE_URL;
  }

  const sanitizedBaseUrl = baseUrl.replace(/\/$/, '');

  if (sanitizedBaseUrl === '/api' || sanitizedBaseUrl.endsWith('/api')) {
    return sanitizedBaseUrl;
  }

  if (
    sanitizedBaseUrl.startsWith('http://') ||
    sanitizedBaseUrl.startsWith('https://')
  ) {
    return `${sanitizedBaseUrl}/api`;
  }

  return sanitizedBaseUrl;
}

const baseURL = normalizeApiBaseUrl(envBaseURL);
const monetizationEnabled =
  import.meta.env.VITE_MONETIZATION_ENABLED !== 'false';
export const AUTH_EXPIRED_EVENT = 'auth:expired';
let authExpirationDispatched = false;

console.log(
  `[api/client] Using API base URL (${envBaseURL ? 'VITE_API_URL' : 'fallback'}):`,
  baseURL,
);

const api = axios.create({
  baseURL,
});

export function setAuthToken(token?: string) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    authExpirationDispatched = false;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

export function setCompanyId(companyId?: string) {
  if (companyId) {
    api.defaults.headers.common['X-Company-Id'] = companyId;
  } else {
    delete api.defaults.headers.common['X-Company-Id'];
  }
}

export default api;

// Global PAYWALL interceptor -> dispatch event for UI
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (
      error?.response?.status === 401 &&
      api.defaults.headers.common['Authorization'] &&
      !authExpirationDispatched
    ) {
      authExpirationDispatched = true;
      setAuthToken(undefined);
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }

    if (!monetizationEnabled) {
      return Promise.reject(error);
    }
    const data = error?.response?.data;
    if (
      data &&
      (data.code === 'PAYWALL' || data?.message?.code === 'PAYWALL')
    ) {
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
