/**
 * Leave Request Types
 *
 * TypeScript interfaces for Leave Request feature
 */

export interface LeaveRequestManager {
  id: number;
  employee_id: number;
  name: string;
  email: string;
  role: string;
}

export interface LeaveRequestDateApproval {
  id: number | null;
  work_date: string | null;
  roster_day_id?: number | null;
  employee_shift_notes?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  status_name: string;
  approval_notes?: string | null;
  approved_at?: string | null;
  manager_employee_id?: number | null;
  manager?: LeaveRequestManager | null;
  current_user_is_assigned_manager?: boolean;
  current_user_can_approve?: boolean;
  current_user_already_approved?: boolean;
  needs_assignment?: boolean;
  label?: string;
}

export interface LeaveRequestApprovalSummary {
  total_dates: number;
  approved_dates: number;
  pending_dates: number;
  rejected_dates: number;
  is_fully_approved: boolean;
}

export interface LeaveRequest {
  id: number;
  employee_id: number;
  request_type: 'doctor_leave' | 'annual_leave' | 'external_duty' | 'educational_assignment';
  start_date: string;
  end_date: string;
  total_days: number;
  reason?: string;
  institution?: string;
  education_type?: string;
  program_course?: string;
  document_path?: string;
  document_url?: string;
  document_mime_type?: string;
  document_original_name?: string;
  status: 'pending' | 'approved' | 'rejected';
  status_name: string;
  request_type_name: string;
  approved_by_manager_id?: number;
  approval_notes?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  current_user_can_approve?: boolean;
  current_user_pending_approval_dates?: string[];
  current_user_already_approved?: boolean;
  approval_dates?: LeaveRequestDateApproval[];
  approval_summary?: LeaveRequestApprovalSummary;
  assigned_managers?: LeaveRequestManager[];
  employee?: {
    id: number;
    user_id: number;
    employee_type: string;
    user: {
      id: number;
      name: string;
      email: string;
    };
  };
  approvedByManager?: {
    id: number;
    employee_type: string;
    user: {
      id: number;
      name: string;
      email: string;
    };
  };
}

export interface CreateLeaveRequestData {
  request_type: 'doctor_leave' | 'annual_leave' | 'external_duty' | 'educational_assignment';
  start_date: string;
  end_date: string;
  reason?: string;
  institution?: string;
  education_type?: string;
  program_course?: string;
  document?: File;
}

export interface UpdateLeaveRequestStatusData {
  status: 'approved' | 'rejected';
  approval_notes?: string;
}

export interface LeaveRequestFilters {
  status?: 'pending' | 'approved' | 'rejected';
  request_type?: 'doctor_leave' | 'annual_leave' | 'external_duty' | 'educational_assignment';
  employee_id?: number;
  start_date?: string;
  end_date?: string;
  page?: number;
  per_page?: number;
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
    from: number;
    to: number;
  };
}

export interface LeaveRequestStatisticsResponse {
  message: string;
  data: LeaveRequestStatistics;
}

export const LEAVE_REQUEST_TYPES = {
  DOCTOR_LEAVE: 'doctor_leave',
  ANNUAL_LEAVE: 'annual_leave',
  EXTERNAL_DUTY: 'external_duty',
  EDUCATIONAL_ASSIGNMENT: 'educational_assignment',
} as const;

export const LEAVE_REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export const LEAVE_REQUEST_TYPE_LABELS = {
  doctor_leave: 'Cuti Dokter',
  annual_leave: 'Cuti Tahunan',
  external_duty: 'Dinas Luar',
  educational_assignment: 'Tugas Pendidikan',
} as const;

export const LEAVE_REQUEST_STATUS_LABELS = {
  pending: 'Menunggu Persetujuan',
  approved: 'Disetujui',
  rejected: 'Ditolak',
} as const;
