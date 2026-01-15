import apiClient from '../../../lib/api';
import type {
  ShiftRequest,
  CreateShiftRequestRequest,
  ApproveRejectRequest,
} from '../../../types';

export const shiftRequestService = {
  // Create Shift Request
  async createShiftRequest(data: CreateShiftRequestRequest): Promise<ShiftRequest> {
    const response = await apiClient.post<ShiftRequest>('/shift-requests', data);
    return response.data;
  },

  // Get Shift Requests (optional, not in docs but useful)
  async getShiftRequests(params?: { status?: string }): Promise<ShiftRequest[]> {
    const response = await apiClient.get<ShiftRequest[]>('/shift-requests', { params });
    return response.data;
  },

  // Approve as Target Employee
  async approveAsTarget(id: number): Promise<ShiftRequest> {
    const response = await apiClient.post<ShiftRequest>(`/shift-requests/${id}/approve-target`);
    return response.data;
  },

  // Approve as Manager
  async approveAsManager(id: number): Promise<ShiftRequest> {
    const response = await apiClient.post<ShiftRequest>(`/shift-requests/${id}/approve-manager`);
    return response.data;
  },

  // Reject Request
  async rejectRequest(id: number, data: ApproveRejectRequest): Promise<ShiftRequest> {
    const response = await apiClient.post<ShiftRequest>(`/shift-requests/${id}/reject`, data);
    return response.data;
  },
};
