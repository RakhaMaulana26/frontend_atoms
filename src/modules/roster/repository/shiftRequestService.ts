import apiClient from '../../../lib/api';

export interface MyShift {
  roster_day_id: number;
  work_date: string;
  shift_id: number;
  shift_name: string;
  notes: string;
  shift_start?: string;
  shift_end?: string;
  has_pending_request?: boolean;
  roster_period_id?: number;
  roster_period_name?: string;
}

export interface AvailablePartner {
  employee_id: number;
  employee_name: string;
  grade?: number | null;
  employee_type: string;
  group_number?: number | null;
  available_shifts: {
    roster_day_id: number;
    work_date: string;
    shift_id: number;
    shift_name: string;
    notes: string;
    has_pending_request?: boolean;
  }[];
}

export interface ShiftRequestPayload {
  target_employee_id: number;
  from_roster_day_id: number;
  to_roster_day_id: number;
  requester_notes: string;
  target_notes: string;
  reason?: string;
}

export interface ShiftRequestItem {
  id: number;
  requester_employee_id: number;
  target_employee_id: number;
  from_roster_day_id: number;
  to_roster_day_id: number;
  requester_notes: string;
  target_notes: string;
  reason?: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
  approved_by_target: boolean;
  approved_by_from_manager: boolean;
  approved_by_to_manager: boolean;
  cancelled_at?: string | null;
  cancelled_by?: number | null;
  rejection_reason?: string | null;
  swap_executed_at?: string | null;
  created_at: string;
  updated_at: string;
  // New fields for current user approval status
  current_user_can_approve_as_target?: boolean;
  current_user_can_approve_as_manager?: boolean;
  current_user_already_approved?: boolean;
  is_manager_to_manager?: boolean;
  // API returns snake_case relationships
  requester_employee?: {
    id: number;
    employee_type: string;
    user?: {
      id: number;
      name: string;
    };
  };
  target_employee?: {
    id: number;
    employee_type: string;
    user?: {
      id: number;
      name: string;
    };
  };
  from_roster_day?: {
    id: number;
    work_date: string;
    roster_period?: {
      id: number;
      month: number;
      year: number;
    };
  };
  to_roster_day?: {
    id: number;
    work_date: string;
    roster_period?: {
      id: number;
      month: number;
      year: number;
    };
  };
  requester_shift_id?: number | null;
  target_shift_id?: number | null;
}

export interface ShiftRequestPendingCount {
  counts: {
    as_target: number;
    as_manager: number;
    my_pending: number;
  };
  total: number;
}

export const shiftRequestService = {
  // Get current user's shifts
  getMyShifts: async () => {
    const response = await apiClient.get<{ data: MyShift[]; count: number }>('/shift-requests/my-shifts');
    return response.data;
  },

  // Get available partners for swap
  getAvailablePartners: async (params?: {
    from_roster_day_id?: number;
    requester_notes?: string;
    roster_month?: number;
    roster_year?: number;
  }) => {
    const response = await apiClient.get<{ data: AvailablePartner[]; count: number }>('/shift-requests/available-partners', {
      params
    });
    return response.data;
  },

  // Create shift swap request
  createShiftRequest: async (payload: ShiftRequestPayload) => {
    const response = await apiClient.post<{ message: string; data: ShiftRequestItem }>('/shift-requests', payload);
    return response.data;
  },

  // Get all shift requests (for display in roster detail)
  getShiftRequests: async (params?: {
    status?: string;
    type?: 'pending_approval' | 'my_requests';
    per_page?: number;
    page?: number;
    roster_period_id?: number;
  }) => {
    const response = await apiClient.get<{ data: ShiftRequestItem[]; meta: { current_page: number; last_page: number; per_page: number; total: number } }>('/shift-requests', {
      params
    });
    return response.data;
  },

  // Get single shift request detail  
  getShiftRequest: async (id: number) => {
    const response = await apiClient.get<{ data: ShiftRequestItem; managers: any }>(`/shift-requests/${id}`);
    return response.data;
  },

  // Get pending count
  getPendingCount: async () => {
    const response = await apiClient.get<ShiftRequestPendingCount>('/shift-requests/pending-count');
    return response.data;
  },

  // Approve as target employee
  approveAsTarget: async (id: number) => {
    const response = await apiClient.post<{ message: string; data: ShiftRequestItem }>(`/shift-requests/${id}/approve-target`);
    return response.data;
  },

  // Approve as manager
  approveAsManager: async (id: number) => {
    const response = await apiClient.post<{ message: string; data: ShiftRequestItem }>(`/shift-requests/${id}/approve-manager`);
    return response.data;
  },

  // Reject request
  rejectRequest: async (id: number, data?: { reason?: string }) => {
    const response = await apiClient.post<{ message: string }>(`/shift-requests/${id}/reject`, data);
    return response.data;
  },

  // Cancel request
  cancelRequest: async (id: number) => {
    const response = await apiClient.post<{ message: string }>(`/shift-requests/${id}/cancel`);
    return response.data;
  },

  // Get manager for a specific shift
  getManagerForShift: async (params: { roster_day_id: number; notes: string }) => {
    const response = await apiClient.get<{ 
      data: { employee_id: number; user_id: number; name: string; notes: string } | null;
      message?: string;
    }>('/shift-requests/manager-for-shift', { params });
    return response.data;
  },

  // Check if current user is a manager (including temporary duty assignments)
  checkManagerStatus: async (params?: { roster_period_id?: number }) => {
    const response = await apiClient.get<{ 
      data: { is_role_manager: boolean; has_manager_duties: boolean; is_manager: boolean };
    }>('/shift-requests/check-manager-status', { params });
    return response.data;
  },
};
