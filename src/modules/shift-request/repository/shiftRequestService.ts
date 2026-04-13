import apiClient from '../../../lib/api';
import type {
  ShiftRequest,
  CreateShiftRequestRequest,
  ApproveRejectRequest,
  MyShift,
  AvailableSwapPartner,
  ShiftRequestPendingCount,
} from '../../../types';

interface PaginatedShiftRequestResponse {
  data: ShiftRequest[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export const shiftRequestService = {
  // Get list of shift requests with optional filters
  async getShiftRequests(params?: { 
    status?: string;
    type?: 'pending_approval' | 'my_requests';
    per_page?: number;
    page?: number;
  }): Promise<PaginatedShiftRequestResponse> {
    const response = await apiClient.get<PaginatedShiftRequestResponse>('/shift-requests', { params });
    return response.data;
  },

  // Get single shift request detail
  async getShiftRequest(id: number): Promise<{ data: ShiftRequest; managers: any }> {
    const response = await apiClient.get<{ data: ShiftRequest; managers: any }>(`/shift-requests/${id}`);
    return response.data;
  },

  // Create new shift swap request
  async createShiftRequest(data: CreateShiftRequestRequest): Promise<{ message: string; data: ShiftRequest }> {
    const response = await apiClient.post<{ message: string; data: ShiftRequest }>('/shift-requests', data);
    return response.data;
  },

  // Get current user's swappable shifts
  async getMyShifts(): Promise<{ data: MyShift[]; count: number }> {
    const response = await apiClient.get<{ data: MyShift[]; count: number }>('/shift-requests/my-shifts');
    return response.data;
  },

  // Get available partners for swap
  async getAvailablePartners(params?: {
    from_roster_day_id?: number;
    requester_notes?: string;
  }): Promise<{ data: AvailableSwapPartner[]; count: number }> {
    const response = await apiClient.get<{ data: AvailableSwapPartner[]; count: number }>('/shift-requests/available-partners', { params });
    return response.data;
  },

  // Get pending request counts
  async getPendingCount(): Promise<ShiftRequestPendingCount> {
    const response = await apiClient.get<ShiftRequestPendingCount>('/shift-requests/pending-count');
    return response.data;
  },

  // Approve as Target Employee
  async approveAsTarget(id: number): Promise<{ message: string; data: ShiftRequest }> {
    const response = await apiClient.post<{ message: string; data: ShiftRequest }>(`/shift-requests/${id}/approve-target`);
    return response.data;
  },

  // Approve as Manager
  async approveAsManager(id: number): Promise<{ message: string; data: ShiftRequest }> {
    const response = await apiClient.post<{ message: string; data: ShiftRequest }>(`/shift-requests/${id}/approve-manager`);
    return response.data;
  },

  // Reject Request
  async rejectRequest(id: number, data?: ApproveRejectRequest): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(`/shift-requests/${id}/reject`, data);
    return response.data;
  },

  // Cancel own request
  async cancelRequest(id: number): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(`/shift-requests/${id}/cancel`);
    return response.data;
  },
};
