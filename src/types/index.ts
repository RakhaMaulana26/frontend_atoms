// User & Employee Types
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'Admin' | 'Cns' | 'Support' | 'Manager Teknik' | 'General Manager';
  role_name?: string;
  grade?: number;
  is_active: boolean;
  last_login?: string;
  employee?: Employee;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Employee {
  id: number;
  user_id: number;
  employee_type: 'Administrator' | 'CNS' | 'Support' | 'Manager Teknik' | 'General Manager';
  employee_type_name?: string;
  is_active: boolean;
  user?: User;
  created_at: string;
  updated_at: string;
}

// Role Constants
export const USER_ROLES = {
  ADMIN: 'Admin',
  CNS: 'Cns',
  SUPPORT: 'Support',
  MANAGER_TEKNIK: 'Manager Teknik',
  GENERAL_MANAGER: 'General Manager'
} as const;

export const USER_ROLE_LABELS = {
  [USER_ROLES.ADMIN]: 'Administrator',
  [USER_ROLES.CNS]: 'CNS',
  [USER_ROLES.SUPPORT]: 'Support',
  [USER_ROLES.MANAGER_TEKNIK]: 'Manager Teknik',
  [USER_ROLES.GENERAL_MANAGER]: 'General Manager'
} as const;

// Employee Type Constants
export const EMPLOYEE_TYPES = {
  ADMIN: 'Administrator',
  CNS: 'CNS',
  SUPPORT: 'Support',
  MANAGER_TEKNIK: 'Manager Teknik',
  GENERAL_MANAGER: 'General Manager'
} as const;

export const EMPLOYEE_TYPE_LABELS = {
  [EMPLOYEE_TYPES.ADMIN]: 'Administrator',
  [EMPLOYEE_TYPES.CNS]: 'CNS',
  [EMPLOYEE_TYPES.SUPPORT]: 'Support',
  [EMPLOYEE_TYPES.MANAGER_TEKNIK]: 'Manager Teknik',
  [EMPLOYEE_TYPES.GENERAL_MANAGER]: 'General Manager'
} as const;

export type EmployeeType = typeof EMPLOYEE_TYPES[keyof typeof EMPLOYEE_TYPES];

// Authentication Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface AccountToken {
  id: number;
  user_id: number;
  token: string;
  type: 'activation' | 'reset_password';
  expired_at: string;
}

export interface VerifyTokenRequest {
  token: string;
}

export interface VerifyTokenResponse {
  message: string;
  valid: boolean;
  type?: string;
  user?: {
    id: number;
    name: string;
    email: string;
    has_password: boolean;
  };
}

export interface SetPasswordRequest {
  token: string;
  password: string;
  password_confirmation: string;
}

export interface SetPasswordResponse {
  message: string;
  action: 'activation' | 'reset';
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

// Shift Types
export interface Shift {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  code: 'pagi' | 'siang' | 'malam';
}

// Roster Types
export interface RosterPeriod {
  id: number;
  month: number;
  year: number;
  status: 'draft' | 'published';
  spreadsheet_url?: string | null; // Linked Google Spreadsheet URL
  last_synced_at?: string | null;  // Last sync timestamp
  published_at?: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  rosterDays?: RosterDay[];
}

export interface RosterDay {
  id: number;
  roster_period_id: number;
  work_date: string;
  manager_id?: number;
  manager?: Employee;
  shift_assignments?: ShiftAssignment[];
  created_at: string;
  updated_at: string;
}

export interface ShiftAssignment {
  id: number;
  roster_day_id: number;
  employee_id: number;
  shift_id: number;
  employee?: Employee;
  shift?: Shift;
  created_at: string;
  updated_at: string;
}

export interface CreateRosterRequest {
  month: number;
  year: number;
}

// Shift Request Types
export interface ShiftRequest {
  id: number;
  requester_id: number;
  target_employee_id: number;
  from_roster_day_id: number;
  to_roster_day_id: number;
  shift_id: number;
  reason: string;
  status: 'pending' | 'approved_target' | 'approved_manager' | 'rejected';
  rejection_reason?: string | null;
  requester?: Employee;
  target_employee?: Employee;
  from_roster_day?: RosterDay;
  to_roster_day?: RosterDay;
  shift?: Shift;
  created_at: string;
  updated_at: string;
}

export interface CreateShiftRequestRequest {
  target_employee_id: number;
  from_roster_day_id: number;
  to_roster_day_id: number;
  shift_id: number;
  reason: string;
}

export interface ApproveRejectRequest {
  rejection_reason?: string;
}

// Notification Types
export interface Notification {
  id: number;
  user_id: number;
  sender_id?: number;
  type: 'inbox' | 'sent';
  title: string;
  message: string;
  data?: any;
  is_read: boolean;
  is_starred: boolean;
  read_at?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  sender?: {
    id: number;
    name: string;
    email: string;
  };
}

// Admin Types
export interface CreateUserRequest {
  name: string;
  email: string;
  role: 'Admin' | 'Cns' | 'Support' | 'Manager Teknik' | 'General Manager';
  employee_type: 'Administrator' | 'CNS' | 'Support' | 'Manager Teknik' | 'General Manager';
  grade?: number;
  is_active: boolean;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: 'Admin' | 'Cns' | 'Support' | 'Manager Teknik' | 'General Manager';
  employee_type?: 'Administrator' | 'CNS' | 'Support' | 'Manager Teknik' | 'General Manager';
  grade?: number;
  is_active?: boolean;
}

export interface GenerateTokenResponse {
  token: string;
  expired_at: string;
  purpose?: 'activation' | 'reset_password';
  message?: string;
}

// Pagination Types
export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

// API Response Types
export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}
