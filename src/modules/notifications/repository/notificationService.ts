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

export const notificationService = {
  // Get Notifications
  async getNotifications(): Promise<PaginatedResponse<Notification>> {
    const response = await apiClient.get<PaginatedResponse<Notification>>('/notifications');
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
