import apiClient from '../../../lib/api';
import type { LeaveRequest } from '../types/leaveRequest';

export interface LeaveRequestResponse {
  message: string;
  data: LeaveRequest;
}

export interface LeaveRequestListResponse {
  message: string;
  data: {
    data: LeaveRequest[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface LeaveRequestStatistics {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  by_type: {
    doctor_leave: number;
    annual_leave: number;
    external_duty: number;
    educational_assignment: number;
  };
  total_approved_days: number;
}

export interface LeaveApprovalPreview {
  approvals: Array<{
    work_date: string;
    manager_employee_id: number | null;
    manager_name: string | null;
    manager_role: string | null;
    employee_shift_notes: string | null;
  }>;
  unique_approvers: Array<{
    manager_employee_id: number;
    manager_name: string | null;
    manager_role: string | null;
  }>;
  missing_dates: string[];
  off_dates: string[];
}

class LeaveRequestService {
  private getBackendBaseUrl(): string {
    const configuredBackendUrl = import.meta.env.VITE_BACKEND_URL;
    if (configuredBackendUrl) {
      return configuredBackendUrl.replace(/\/$/, '');
    }

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

    try {
      const parsedUrl = new URL(apiUrl);
      return `${parsedUrl.protocol}//${parsedUrl.host}`;
    } catch {
      return 'http://localhost:8000';
    }
  }

  /**
   * Create new leave request
   */
  async createLeaveRequest(formData: FormData): Promise<LeaveRequestResponse> {
    const response = await apiClient.post<LeaveRequestResponse>(
      '/leave-requests',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }

  /**
   * Get all leave requests (for managers)
   */
  async getLeaveRequests(params?: {
    status?: string;
    request_type?: string;
    employee_id?: number;
    start_date?: string;
    end_date?: string;
    page?: number;
    per_page?: number;
  }): Promise<LeaveRequestListResponse> {
    const response = await apiClient.get<LeaveRequestListResponse>('/leave-requests', {
      params,
    });
    return response.data;
  }

  /**
   * Get current user's leave requests
   */
  async getMyLeaveRequests(params?: {
    status?: string;
    request_type?: string;
    page?: number;
    per_page?: number;
  }): Promise<LeaveRequestListResponse> {
    const response = await apiClient.get<LeaveRequestListResponse>('/leave-requests/my-requests', {
      params,
    });
    return response.data;
  }

  /**
   * Get leave request by ID
   */
  async getLeaveRequestById(id: number): Promise<LeaveRequestResponse> {
    const response = await apiClient.get<LeaveRequestResponse>(`/leave-requests/${id}`);
    return response.data;
  }

  /**
   * Update leave request status (approve/reject) - Manager only
   */
  async updateLeaveRequestStatus(
    id: number,
    data: {
      status: 'approved' | 'rejected';
      approval_notes?: string;
    }
  ): Promise<LeaveRequestResponse> {
    const response = await apiClient.post<LeaveRequestResponse>(
      `/leave-requests/${id}/update-status`,
      data
    );
    return response.data;
  }

  /**
   * Delete/cancel leave request
   */
  async deleteLeaveRequest(id: number): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/leave-requests/${id}`);
    return response.data;
  }

  /**
   * Get leave request statistics
   */
  async getStatistics(year?: number): Promise<{ message: string; data: LeaveRequestStatistics }> {
    const response = await apiClient.get<{ message: string; data: LeaveRequestStatistics }>(
      '/leave-requests/statistics',
      {
        params: { year },
      }
    );
    return response.data;
  }

  /**
   * Preview managers who will approve selected leave period
   */
  async getApprovalPreview(params: {
    request_type: string;
    start_date: string;
    end_date: string;
  }): Promise<{ message: string; data: LeaveApprovalPreview }> {
    const response = await apiClient.get<{ message: string; data: LeaveApprovalPreview }>(
      '/leave-requests/approval-preview',
      { params }
    );
    return response.data;
  }

  /**
   * Get document URL for viewing/downloading
   */
  getDocumentUrl(documentPath: string): string {
    const normalizedPath = documentPath.replace(/^\/+/, '');
    return `${this.getBackendBaseUrl()}/storage/${normalizedPath}`;
  }

  normalizeDocumentUrl(documentUrl?: string | null): string | null {
    if (!documentUrl) {
      return null;
    }

    if (/^https?:\/\//i.test(documentUrl)) {
      return documentUrl;
    }

    if (documentUrl.startsWith('/')) {
      return `${this.getBackendBaseUrl()}${documentUrl}`;
    }

    return this.getDocumentUrl(documentUrl);
  }

  async getLeaveRequestDocumentBlob(id: number): Promise<{ blob: Blob; filename: string; mimeType: string }> {
    const response = await apiClient.get<Blob>(`/leave-requests/${id}/document`, {
      responseType: 'blob',
    });

    const contentDisposition = response.headers['content-disposition'] as string | undefined;
    const fileNameMatch = contentDisposition?.match(/filename\*?=(?:UTF-8''|\")?([^\";]+)/i);
    const parsedFileName = fileNameMatch?.[1]?.replace(/['"]/g, '').trim();

    const mimeType = (response.headers['content-type'] as string | undefined) || response.data.type || 'application/octet-stream';
    const extension = mimeType.includes('pdf') ? '.pdf' : mimeType.startsWith('image/') ? '.jpg' : '';
    const filename = parsedFileName || `leave-request-${id}${extension}`;

    return {
      blob: response.data,
      filename,
      mimeType,
    };
  }
}

export const leaveRequestService = new LeaveRequestService();
