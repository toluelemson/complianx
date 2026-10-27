import api from '@/platform/api/client';

export function submitContactRequest(payload: Record<string, unknown>) {
  return api.post('/contact', payload).then((response) => response.data);
}
