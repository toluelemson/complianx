import api from '@/platform/api/client';

export function getUnreadNotificationCount() {
  return api.get('/notifications/count').then((response) => response.data);
}

export function listUnreadNotifications() {
  return api
    .get('/notifications?unreadOnly=true&limit=5')
    .then((response) => response.data);
}

export function markAllNotificationsRead() {
  return api.post('/notifications/read-all').then((response) => response.data);
}

export function markNotificationRead(id: string) {
  return api.post(`/notifications/${id}/read`).then((response) => response.data);
}
