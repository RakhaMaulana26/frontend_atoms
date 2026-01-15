import apiClient from '../../../lib/api';
import type { Notification } from '../../../types';

export const notificationService = {
  // Get Notifications
  async getNotifications(): Promise<Notification[]> {
    const response = await apiClient.get<Notification[]>('/notifications');
    return response.data;
  },

  // Mark as Read
  async markAsRead(id: number): Promise<{ message: string }> {
    const response = await apiClient.post(`/notifications/${id}/read`);
    return response.data;
  },

  // Mark all as read (optional helper)
  async markAllAsRead(ids: number[]): Promise<void> {
    await Promise.all(ids.map((id) => this.markAsRead(id)));
  },
};
