import apiClient from '../lib/api';

export interface ActivityLog {
  id: number;
  user_id: number;
  action: string;
  module: string;
  reference_id?: number;
  description: string;
  created_at: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface ActivityLogFilters {
  module?: string;
  action?: string;
  user_id?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface ActivityLogResponse {
  success: boolean;
  data: ActivityLog[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
  };
}

export interface ActivityLogStatistics {
  total_activities: number;
  today_activities: number;
  week_activities: number;
  month_activities: number;
  by_module: Record<string, number>;
  by_action: Record<string, number>;
}

export const activityLogService = {
  // Get activity logs with pagination and filters
  getActivityLogs: async (filters?: ActivityLogFilters): Promise<ActivityLogResponse> => {
    const params = new URLSearchParams();
    
    if (filters?.module) params.append('module', filters.module);
    if (filters?.action) params.append('action', filters.action);
    if (filters?.user_id) params.append('user_id', filters.user_id.toString());
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.per_page) params.append('per_page', filters.per_page.toString());

    const query = params.toString();
    const response = await apiClient.get(`/activity-logs${query ? `?${query}` : ''}`);
    return response.data;
  },

  // Get recent activities
  getRecentActivities: async (): Promise<{ success: boolean; data: ActivityLog[] }> => {
    const response = await apiClient.get('/activity-logs/recent');
    return response.data;
  },

  // Get activity statistics
  getStatistics: async (): Promise<{ success: boolean; data: ActivityLogStatistics }> => {
    const response = await apiClient.get('/activity-logs/statistics');
    return response.data;
  },
};