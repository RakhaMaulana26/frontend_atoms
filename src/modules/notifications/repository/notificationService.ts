import apiClient from '../../../lib/api';
import type { Notification } from '../../../types';

// Define paginated response type
interface PaginatedResponse<T> {
  current_page: number;
  data: T[];
  first_page_url: string;
  from: number;
  last_page: number;
  last_page_url: string;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
  total: number;
}

interface GetNotificationsParams {
  category?: 'inbox' | 'starred' | 'sent' | 'trash';
  page?: number;
  per_page?: number;
}

interface SendNotificationData {
  user_ids: number[];
  title: string;
  message: string;
  send_email?: boolean;
}

export const notificationService = {
  // Get Notifications with category filter
  async getNotifications(params: GetNotificationsParams = {}): Promise<PaginatedResponse<Notification>> {
    const response = await apiClient.get<PaginatedResponse<Notification>>('/notifications', {
      params
    });
    return response.data;
  },

  // Send Notification
  async sendNotification(data: SendNotificationData): Promise<{ message: string }> {
    const response = await apiClient.post('/notifications/send', data);
    return response.data;
  },

  // Toggle Star
  async toggleStar(id: number): Promise<{ message: string; is_starred: boolean }> {
    const response = await apiClient.post(`/notifications/${id}/star`);
    return response.data;
  },

  // Delete Notification (move to trash)
  async deleteNotification(id: number): Promise<{ message: string }> {
    const response = await apiClient.delete(`/notifications/${id}`);
    return response.data;
  },

  // Restore from Trash
  async restoreNotification(id: number): Promise<{ message: string }> {
    const response = await apiClient.post(`/notifications/${id}/restore`);
    return response.data;
  },

  // Permanent Delete
  async permanentDelete(id: number): Promise<{ message: string }> {
    const response = await apiClient.delete(`/notifications/${id}/permanent`);
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
