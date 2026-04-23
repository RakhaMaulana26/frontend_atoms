import apiClient from '../../../lib/api';
import type { Notification, MorningTask } from '../../../types';

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

interface CreateMorningTaskData {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  assigned_to?: number[];
}

interface UpdateMorningTaskData {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'pending' | 'in_progress' | 'completed';
  assigned_to?: number[];
}

// Response type for all notifications endpoint
interface AllNotificationsResponse {
  data: {
    inbox: Notification[];
    roster?: Notification[];
    starred: Notification[];
    sent: Notification[];
    trash: Notification[];
  };
  stats: {
    inbox: number;
    starred: number;
    sent: number;
    trash: number;
    unread: number;
  };
  pagination?: {
    page: number;
    per_page: number;
    inbox_total: number;
    roster_total: number;
    starred_total: number;
    sent_total: number;
    trash_total: number;
  };
}

interface GetAllNotificationsParams {
  page?: number;
  per_page?: number;
}

export const notificationService = {
  // Get ALL notifications in one request (categorized)
  async getAllNotifications(params: GetAllNotificationsParams = {}): Promise<AllNotificationsResponse> {
    const response = await apiClient.get<AllNotificationsResponse>('/notifications/all', { params });
    return response.data;
  },

  // Get Notifications with category filter (legacy, still works)
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
    const response = await apiClient.put(`/notifications/${id}/read`);
    return response.data;
  },

  // Mark all as read (optional helper)
  async markAllAsRead(ids: number[]): Promise<void> {
    await Promise.all(ids.map((id) => this.markAsRead(id)));
  },

  // Morning Tasks
  async getMorningTasks(date?: string): Promise<MorningTask[]> {
    const params = date ? { date } : {};
    const response = await apiClient.get<{ data: MorningTask[] }>('/morning-tasks', { params });
    return response.data.data;
  },

  async createMorningTask(data: CreateMorningTaskData): Promise<MorningTask> {
    const response = await apiClient.post<{ data: MorningTask }>('/morning-tasks', data);
    return response.data.data;
  },

  async updateMorningTask(id: number, data: UpdateMorningTaskData): Promise<MorningTask> {
    const response = await apiClient.put<{ data: MorningTask }>(`/morning-tasks/${id}`, data);
    return response.data.data;
  },

  async deleteMorningTask(id: number): Promise<{ message: string }> {
    const response = await apiClient.delete(`/morning-tasks/${id}`);
    return response.data;
  },

  async sendMorningTasksNotification(): Promise<{ message: string }> {
    const response = await apiClient.post('/morning-tasks/send-notification');
    return response.data;
  },
};
