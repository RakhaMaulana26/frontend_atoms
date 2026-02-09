import apiClient from '../../../lib/api';

export interface MyShift {
  roster_day_id: number;
  work_date: string;
  shift_id: number;
  shift_name: string;
  shift_start: string;
  shift_end: string;
}

export interface AvailablePartner {
  employee_id: number;
  employee_name: string;
  employee_role: string;
  available_shifts: {
    roster_day_id: number;
    work_date: string;
    shift_id: number;
    shift_name: string;
  }[];
}

export interface ShiftRequestPayload {
  target_employee_id: number;
  from_roster_day_id: number;
  to_roster_day_id: number;
  shift_id: number;
  reason: string;
}

export interface ShiftRequestItem {
  id: number;
  requester_employee_id: number;
  target_employee_id: number;
  from_roster_day_id: number;
  to_roster_day_id: number;
  shift_id: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by_target: boolean;
  approved_by_manager: boolean;
  created_at: string;
  requester_employee?: {
    id: number;
    user: {
      name: string;
    };
    role: string;
  };
  target_employee?: {
    id: number;
    user: {
      name: string;
    };
    role: string;
  };
  from_roster_day?: {
    work_date: string;
  };
  to_roster_day?: {
    work_date: string;
  };
  shift?: {
    name: string;
    start_time: string;
    end_time: string;
  };
}

export const shiftRequestService = {
  // Get current user's shifts
  getMyShifts: async () => {
    const response = await apiClient.get<{ data: MyShift[] }>('/shift-requests/my-shifts');
    return response.data;
  },

  // Get available partners for swap
  getAvailablePartners: async (params?: {
    roster_day_id?: number;
    shift_id?: number;
    employee_id?: number;
  }) => {
    const response = await apiClient.get<{ data: AvailablePartner[] }>('/shift-requests/available-partners', {
      params
    });
    return response.data;
  },

  // Create shift swap request
  createShiftRequest: async (payload: ShiftRequestPayload) => {
    const response = await apiClient.post('/shift-requests', payload);
    return response.data;
  },

  // Get all shift requests (for display in roster detail)
  getShiftRequests: async (params?: {
    status?: string;
    roster_period_id?: number;
  }) => {
    const response = await apiClient.get<{ data: ShiftRequestItem[] }>('/shift-requests', {
      params
    });
    return response.data;
  },
};
