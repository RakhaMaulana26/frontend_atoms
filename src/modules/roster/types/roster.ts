/**
 * Roster Module Types
 * 
 * TypeScript interfaces matching backend API responses
 * from API_DOCUMENTATION.md - Roster Management section
 */

// Employee Types
export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Employee {
  id: number;
  user_id: number;
  employee_type: 'CNS' | 'Support' | 'Manager Teknik' | 'General Manager';
  user: User;
}

// Shift Types
export interface Shift {
  id: number;
  shift_name: string;
  start_time: string; // Format: "07:00:00"
  end_time: string;   // Format: "19:00:00"
}

// Shift Assignment (Employee assigned to shift on specific day)
export interface ShiftAssignment {
  id: number;
  roster_day_id: number;
  employee_id: number;
  shift_id: number;
  created_at: string;
  employee: Employee;
  shift: Shift;
}

// Manager Duty (Manager assigned to specific day)
export interface ManagerDuty {
  id: number;
  roster_day_id: number;
  employee_id: number;
  duty_type: 'Manager Teknik' | 'General Manager';
  created_at: string;
  employee: Employee;
}

// Roster Day (Single day in roster period)
export interface RosterDay {
  id: number;
  roster_period_id: number;
  work_date: string; // Format: "2026-01-01"
  created_at: string;
  updated_at: string;
  shift_assignments?: ShiftAssignment[];
  manager_duties?: ManagerDuty[];
}

// Roster Period (Month-long roster template)
export interface RosterPeriod {
  id: number;
  month: number; // 1-12
  year: number;
  status: 'draft' | 'published';
  spreadsheet_url?: string | null; // Linked Google Spreadsheet URL
  last_synced_at?: string | null;  // Last sync timestamp
  created_at: string;
  updated_at: string;
  roster_days?: RosterDay[];
}

// Assignment Creation Requests
export interface CreateShiftAssignmentRequest {
  employee_id: number;
  shift_id: number;
}

export interface CreateManagerDutyRequest {
  employee_id: number;
  duty_type: 'Manager Teknik' | 'General Manager';
}

export interface CreateAssignmentsRequest {
  shift_assignments?: CreateShiftAssignmentRequest[];
  manager_duties?: CreateManagerDutyRequest[];
}

// Validation Types
export interface ShiftValidation {
  shift_name: string;
  cns_count: number;
  support_count: number;
  total_count: number;
  is_valid: boolean;
  message?: string;
}

export interface DayValidation {
  date: string;
  is_valid: boolean;
  manager_count: number;
  errors: string[];
  shifts: ShiftValidation[];
}

export interface RosterValidation {
  is_valid: boolean;
  total_days: number;
  valid_days: number;
  invalid_days: DayValidation[];
  errors: string[];
}

// API Response Types
export interface RosterListResponse {
  data: RosterPeriod[];
}

export interface RosterDetailResponse {
  data: RosterPeriod;
}

export interface RosterDayDetailResponse {
  data: RosterDay;
}

export interface CreateRosterResponse {
  message: string;
  data: RosterPeriod;
}

export interface PublishRosterResponse {
  message: string;
  data: RosterPeriod;
  validation: RosterValidation;
}

export interface ValidateRosterResponse {
  message: string;
  validation: RosterValidation;
}

export interface AssignmentsResponse {
  message: string;
  data: RosterDay;
  validation: Record<string, ShiftValidation>;
}
