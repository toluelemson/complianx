import api from '@/platform/api/client';

export function submitContactRequest(payload: object) {
  return api.post('/contact', payload).then((response) => response.data);
}
