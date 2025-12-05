import axios from 'axios';

const DEFAULT_API_BASE_URL = 'http://localhost:3000';
const envBaseURL = import.meta.env.VITE_API_URL;
const baseURL = envBaseURL ?? DEFAULT_API_BASE_URL;

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
