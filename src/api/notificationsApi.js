import client from './client';

export async function getNotifications() {
  return client.get('/notifications');
}

export async function markNotificationRead(id) {
  return client.patch(`/notifications/${id}/read`);
}
