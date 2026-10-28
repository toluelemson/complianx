import api from '@/platform/api/client';

export function getInvitation(token: string) {
  return api.get(`/invitations/${token}`).then((response) => response.data);
}

export function signUp(payload: object) {
  return api.post('/auth/signup', payload).then((response) => response.data);
}

export function logIn(payload: { email: string; password: string }) {
  return api.post('/auth/login', payload).then((response) => response.data);
}

export function resendVerification(email: string) {
  return api.post('/auth/resend-verification', { email });
}

export function requestPasswordReset(payload: { email: string }) {
  return api.post('/auth/request-password-reset', payload);
}

export function resetPassword(token: string, password: string) {
  return api.post('/auth/reset-password', { token, password });
}

export function getCurrentUser() {
  return api.get('/users/me').then((response) => response.data);
}

export function updateCurrentUser(payload: object) {
  return api.patch('/users/me', payload).then((response) => response.data);
}
