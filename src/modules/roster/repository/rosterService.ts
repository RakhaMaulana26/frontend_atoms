/**
 * Roster Service
 * 
 * API service layer for roster management
 * Maps to backend endpoints from API_DOCUMENTATION.md
 */

import apiClient from '../../../lib/api';
import type {
  RosterPeriod,
  RosterDay,
  Employee,
  Shift,
  CreateAssignmentsRequest,
  RosterValidation,
  AssignmentsResponse,
  PublishRosterResponse,
  ValidateRosterResponse
} from '../types/roster';

export const rosterService = {
  /**
   * Get list of roster periods with optional filters
   * GET /rosters
   */
  async getRosters(params?: { month?: number; year?: number }): Promise<RosterPeriod[]> {
    const response = await apiClient.get<RosterPeriod[]>('/rosters', { params });
    return response.data;
  },

  /**
   * Get auto-assigned users by date/shift (AI or roster rules)
   * GET /api/roster/auto-assignment
   */
  async getAutoAssignedUsers(params: { date: string; shift: '07-13' | '13-19' | '19-07' }): Promise<{ users: Array<{id:number; name:string; role:string}> }> {
    const response = await apiClient.get('/roster/auto-assignment', { params });
    const payload = response.data as { users?: Array<{id:number; name:string; role:string}>; data?: Array<{id:number; name:string; role:string}> };
    return {
      users: Array.isArray(payload.users)
        ? payload.users
        : Array.isArray(payload.data)
        ? payload.data
        : [],
    };
  },

  /**
   * Create new roster template for a month
   * POST /rosters
   */
  async createRoster(data: { month: number; year: number }): Promise<RosterPeriod> {
    const response = await apiClient.post<{ 
      message: string; 
      data: { roster_period: RosterPeriod; all_employees: Employee[]; all_shifts: Shift[] } 
    }>('/rosters', data);
    
    // Merge roster_period with all_employees and all_shifts
    return {
      ...response.data.data.roster_period,
      all_employees: response.data.data.all_employees,
      all_shifts: response.data.data.all_shifts
    };
  },

  /**
   * Get detailed roster information with all assignments
   * GET /rosters/:id
   * 
   * Response is optimized with compact shift_assignments (only IDs).
   * This function hydrates the data with full employee/shift objects.
   */
  async getRoster(rosterId: number): Promise<{ 
    roster_period: RosterPeriod; 
    all_employees: Employee[];
    all_shifts: Shift[];
  }> {
    const response = await apiClient.get<{ 
      roster_period: RosterPeriod; 
      all_employees: Employee[];
      all_shifts: Shift[];
    }>(`/rosters/${rosterId}`);
    
    const { roster_period, all_employees, all_shifts } = response.data;
    
    // Create lookup maps for fast hydration
    const employeeMap = new Map<number, Employee>();
    all_employees.forEach(emp => employeeMap.set(emp.id, emp));
    
    const shiftMap = new Map<number, Shift>();
    all_shifts.forEach(shift => shiftMap.set(shift.id, shift));
    
    // Hydrate roster_days with full employee/shift objects
    const hydratedRosterPeriod: RosterPeriod = {
      ...roster_period,
      roster_days: roster_period.roster_days?.map(day => ({
        ...day,
        // Hydrate shift_assignments with employee and shift objects
        shift_assignments: day.shift_assignments?.map(assignment => ({
          ...assignment,
          employee: employeeMap.get(assignment.employee_id) || {
            id: assignment.employee_id,
            user_id: 0,
            employee_type: 'CNS' as const,
            user: { id: 0, name: 'Unknown', email: '' }
          },
          shift: assignment.shift_id != null ? (shiftMap.get(assignment.shift_id) || null) : null,
        })),
        // Hydrate manager_duties with employee and shift objects
        manager_duties: day.manager_duties?.map(duty => ({
          ...duty,
          employee: employeeMap.get(duty.employee_id) || {
            id: duty.employee_id,
            user_id: 0,
            employee_type: 'Manager Teknik' as const,
            user: { id: 0, name: 'Unknown', email: '' }
          },
          shift: shiftMap.get(duty.shift_id),
        })),
      }))
    };
    
    return {
      roster_period: hydratedRosterPeriod,
      all_employees,
      all_shifts
    };
  },

  /**
   * Get specific roster day with assignments
   * GET /rosters/:roster_id/days/:day_id
   */
  async getRosterDay(rosterId: number, dayId: number): Promise<RosterDay> {
    const response = await apiClient.get<RosterDay>(`/rosters/${rosterId}/days/${dayId}`);
    return response.data;
  },

  /**
   * Add assignments to roster day (incremental - doesn't delete existing)
   * POST /rosters/:roster_id/days/:day_id/assignments
   */
  async addAssignments(
    rosterId: number,
    dayId: number,
    data: CreateAssignmentsRequest
  ): Promise<AssignmentsResponse> {
    const response = await apiClient.post<AssignmentsResponse>(
      `/rosters/${rosterId}/days/${dayId}/assignments`,
      data
    );
    return response.data;
  },

  /**
   * Replace all assignments for roster day (deletes existing)
   * PUT /rosters/:roster_id/days/:day_id/assignments
   */
  async updateAssignments(
    rosterId: number,
    dayId: number,
    data: CreateAssignmentsRequest
  ): Promise<AssignmentsResponse> {
    const response = await apiClient.put<AssignmentsResponse>(
      `/rosters/${rosterId}/days/${dayId}/assignments`,
      data
    );
    return response.data;
  },

  /**
   * Quick update assignment (simplified endpoint)
   * POST /rosters/:roster_id/assignments/quick-update
   * 
   * Uses `notes` as primary identifier (P, S, M, L, CT, CS, DL, TB, etc.)
   * `shift_id` is optional - auto-resolved from notes when not provided
   */
  async quickUpdateAssignment(
    rosterId: number,
    data: {
      employee_id: number;
      work_dates: string[]; // Array of dates in 'YYYY-MM-DD' format
      notes: string; // Primary identifier (e.g., 'P', 'S', 'M', 'L', 'CT', 'CS', 'DL', 'TB')
      shift_id?: number; // Optional - auto-resolved from notes if not provided
    }
  ): Promise<{
    message: string;
    data: {
      roster_id: number;
      employee_id: number;
      notes: string;
      dates_updated: number;
      updated_days: any[];
    };
  }> {
    const response = await apiClient.post(
      `/rosters/${rosterId}/assignments/quick-update`,
      data
    );
    return response.data;
  },

  /**
   * Batch update assignments for multiple employees and dates
   * POST /rosters/:roster_id/assignments/batch-update
   * 
   * Uses `notes` as primary identifier (P, S, M, L, CT, CS, DL, TB, etc.)
   * `shift_id` is optional - auto-resolved from notes when not provided
   */
  async batchUpdateAssignments(
    rosterId: number,
    assignments: Array<{
      employee_id: number;
      work_dates: string[]; // Array of dates in 'YYYY-MM-DD' format
      notes: string; // Primary identifier (e.g., 'P', 'S', 'M', 'L', 'CT', 'CS', 'DL', 'TB')
      shift_id?: number; // Optional - auto-resolved from notes if not provided
    }>
  ): Promise<{
    message: string;
    data: {
      roster_id: number;
      total_assignments: number;
      total_updates: number;
      updated_days: any[];
    };
  }> {
    const response = await apiClient.post(
      `/rosters/${rosterId}/assignments/batch-update`,
      { assignments }
    );
    return response.data;
  },

  /**
   * Validate roster before publishing
   * GET /rosters/:id/validate
   */
  async validateRoster(rosterId: number): Promise<RosterValidation> {
    const response = await apiClient.get<ValidateRosterResponse>(`/rosters/${rosterId}/validate`);
    return response.data.validation;
  },

  /**
   * Publish roster (with automatic validation)
   * POST /rosters/:id/publish
   * @param skipValidation - If true, skip validation and force publish
   */
  async publishRoster(rosterId: number, skipValidation: boolean = false): Promise<PublishRosterResponse> {
    const url = skipValidation 
      ? `/rosters/${rosterId}/publish?skip_validation=1`
      : `/rosters/${rosterId}/publish`;
    const response = await apiClient.post<PublishRosterResponse>(url);
    return response.data;
  },

  /**
   * Unpublish roster (change status back to draft)
   * POST /rosters/:id/unpublish
   */
  async unpublishRoster(rosterId: number): Promise<{ message: string; data: RosterPeriod }> {
    const response = await apiClient.post<{ message: string; data: RosterPeriod }>(`/rosters/${rosterId}/unpublish`);
    return response.data;
  },

  /**
   * Import roster from Excel file
   * POST /rosters/import
   */
  async importRoster(file: File, useAI: boolean = false): Promise<{
    message: string;
    data: {
      roster_period: RosterPeriod;
      all_employees: Employee[];
      all_shifts: Shift[];
      month: number;
      year: number;
      stats: {
        employees_processed: number;
        employees_created: number;
        assignments_created: number;
        assignments_skipped: number;
        errors: string[];
      };
    };
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('use_ai', useAI ? '1' : '0');
    
    const response = await apiClient.post('/rosters/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: useAI ? 300000 : 30000, // 5 minutes for AI, 30 seconds for standard
    });
    return response.data;
  },

  /**
   * Import roster from Google Spreadsheet URL
   * POST /rosters/import-url
   */
  async importRosterFromUrl(spreadsheetUrl: string, useAI: boolean = false): Promise<{
    message: string;
    data: {
      roster_period: RosterPeriod;
      all_employees: Employee[];
      all_shifts: Shift[];
      month: number;
      year: number;
      stats: {
        employees_processed: number;
        employees_created: number;
        assignments_created: number;
        assignments_skipped: number;
        errors: string[];
      };
    };
  }> {
    const response = await apiClient.post('/rosters/import-url', {
      spreadsheet_url: spreadsheetUrl,
      use_ai: useAI,
    }, {
      timeout: useAI ? 300000 : 60000, // 5 minutes for AI, 1 minute for standard
    });
    return response.data;
  },

  /**
   * Update roster period
   * PUT /rosters/:id
   */
  async updateRoster(rosterId: number, data: { month?: number; year?: number }): Promise<{
    message: string;
    data: RosterPeriod;
  }> {
    const response = await apiClient.put(`/rosters/${rosterId}`, data);
    return response.data;
  },

  /**
   * Delete roster period
   * DELETE /rosters/:id
   */
  async deleteRoster(rosterId: number): Promise<{ message: string }> {
    const response = await apiClient.delete(`/rosters/${rosterId}`);
    return response.data;
  },

  /**
   * Sync roster from linked Google Spreadsheet
   * POST /rosters/:id/sync
   */
  async syncRoster(rosterId: number): Promise<{
    message: string;
    data: {
      roster_period: RosterPeriod;
      stats: {
        employees_processed: number;
        employees_created: number;
        assignments_updated: number;
        assignments_created: number;
        assignments_deleted: number;
        errors: string[];
      };
    };
  }> {
    const response = await apiClient.post(`/rosters/${rosterId}/sync`, {}, {
      timeout: 60000, // 1 minute timeout
    });
    return response.data;
  },

  /**
   * Update spreadsheet URL for roster
   * PUT /rosters/:id/spreadsheet-url
   */
  async updateSpreadsheetUrl(rosterId: number, spreadsheetUrl: string): Promise<{
    message: string;
    data: RosterPeriod;
  }> {
    const response = await apiClient.put(`/rosters/${rosterId}/spreadsheet-url`, {
      spreadsheet_url: spreadsheetUrl,
    });
    return response.data;
  },

  /**
   * Push roster data to Google Spreadsheet (two-way sync)
   * POST /rosters/:id/push
   */
  async pushToSpreadsheet(rosterId: number): Promise<{
    message: string;
    data: {
      roster_period: RosterPeriod;
      sync_result: {
        success: boolean;
        updated_cells: number;
        rows: number;
        columns: number;
      };
    };
  }> {
    const response = await apiClient.post(`/rosters/${rosterId}/push`, {}, {
      timeout: 60000, // 1 minute timeout
    });
    return response.data;
  },

  /**
   * Add manager to roster (grade 13-14 only)
   * POST /rosters/:id/managers/add
   */
  async addManagerToRoster(rosterId: number, employeeId: number): Promise<{
    message: string;
    data: {
      employee_id: number;
      employee_name: string;
      days_added: number;
      total_days: number;
    };
  }> {
    const response = await apiClient.post(`/rosters/${rosterId}/managers/add`, {
      employee_id: employeeId,
    });
    return response.data;
  },

  /**
   * Remove manager from roster
   * DELETE /rosters/:id/managers/:employeeId
   */
  async removeManagerFromRoster(rosterId: number, employeeId: number): Promise<{
    message: string;
    data: {
      employee_id: number;
      employee_name: string;
      days_removed: number;
    };
  }> {
    const response = await apiClient.delete(`/rosters/${rosterId}/managers/${employeeId}`);
    return response.data;
  },

  /**
   * Assign CNS/Support employee into specific group number
   * POST /rosters/:id/groups/assign
   */
  async assignEmployeeToGroup(
    rosterId: number,
    employeeId: number,
    employeeType: 'CNS' | 'Support' | 'Manager Teknik',
    groupNumber: number
  ): Promise<{
    message: string;
    data: {
      employee_id: number;
      employee_name: string;
      employee_type: 'CNS' | 'Support' | 'Manager Teknik';
      old_group: number | null;
      new_group: number;
      synced_days?: number;
    };
  }> {
    const response = await apiClient.post(`/rosters/${rosterId}/groups/assign`, {
      employee_id: employeeId,
      employee_type: employeeType,
      group_number: groupNumber,
    });
    return response.data;
  },

  /**
   * Remove CNS/Support employee from group formation (group_number -> 0)
   * DELETE /rosters/:id/groups/:employeeId
   */
  async removeEmployeeFromGroup(rosterId: number, employeeId: number): Promise<{
    message: string;
    data: {
      employee_id: number;
      employee_name: string;
      employee_type: 'CNS' | 'Support';
      old_group: number | null;
      new_group: number;
    };
  }> {
    const response = await apiClient.delete(`/rosters/${rosterId}/groups/${employeeId}`);
    return response.data;
  },

  // Helper functions
  helpers: {
    /**
     * Get shift assignments for specific shift on specific day
     */
    getShiftAssignments(day: RosterDay, shiftId: number) {
      return day.shift_assignments?.filter(a => a.shift_id === shiftId) || [];
    },

    /**
     * Get CNS count for specific shift
     */
    getCNSCount(day: RosterDay, shiftId: number) {
      const assignments = this.getShiftAssignments(day, shiftId);
      return assignments.filter(a => a.employee.employee_type === 'CNS').length;
    },

    /**
     * Get Support count for specific shift
     */
    getSupportCount(day: RosterDay, shiftId: number) {
      const assignments = this.getShiftAssignments(day, shiftId);
      return assignments.filter(a => a.employee.employee_type === 'Support').length;
    },

    /**
     * Check if day has required manager for each shift
     */
    hasRequiredManager(day: RosterDay) {
      return (day.manager_duties?.length || 0) >= 1;
    },

    /**
     * Get manager duties for a specific shift on a day
     */
    getShiftManagerDuties(day: RosterDay, shiftId: number) {
      return day.manager_duties?.filter(d => d.shift_id === shiftId) || [];
    },

    /**
     * Format shift time display
     */
    formatShiftTime(shift: { start_time: string; end_time: string }) {
      const formatTime = (time: string) => time.substring(0, 5); // "07:00:00" -> "07:00"
      return `${formatTime(shift.start_time)} - ${formatTime(shift.end_time)}`;
    }
  },

  /**
   * Create roster task
   * POST /api/roster/tasks
   */
  async createRosterTask(data: {
    date: string;
    shift_key: 'pagi' | 'siang' | 'malam';
    role: string;
    assigned_to: number[];
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
  }): Promise<{
    message: string;
    data: {
      id: number;
      date: string;
      shift_key: string;
      role: string;
      assigned_to: number[];
      title: string;
      description: string;
      priority: string;
      status: string;
      created_by: number;
      created_at: string;
      updated_at: string;
    };
  }> {
    const response = await apiClient.post('/roster/tasks', data);
    return response.data;
  },

  /**
   * Get roster tasks
   * GET /api/roster/tasks
   */
  async getRosterTasks(params?: {
    date?: string;
    shift?: 'pagi' | 'siang' | 'malam';
    role?: string;
    assigned_to?: number;
  }): Promise<{
    data: Array<{
      id: number;
      date: string;
      shift_key: string;
      role: string;
      assigned_to: number[];
      title: string;
      description: string;
      priority: string;
      status: string;
      created_by: number;
      created_at: string;
      updated_at: string;
    }>;
    total: number;
  }> {
    const response = await apiClient.get('/roster/tasks', { params });
    return response.data;
  },

  /**
   * Update roster task
   * PUT /api/roster/tasks/:id
   */
  async updateRosterTask(id: number, data: Partial<{
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    status: 'pending' | 'in_progress' | 'done';
    assigned_to: number[];
  }>): Promise<{
    message: string;
    data: {
      id: number;
      date: string;
      shift_key: string;
      role: string;
      assigned_to: number[];
      title: string;
      description: string;
      priority: string;
      status: string;
      created_by: number;
      created_at: string;
      updated_at: string;
    };
  }> {
    const response = await apiClient.put(`/roster/tasks/${id}`, data);
    return response.data;
  },

  /**
   * Delete roster task
   * DELETE /api/roster/tasks/:id
   */
  async deleteRosterTask(id: number): Promise<{ message: string }> {
    const response = await apiClient.delete(`/roster/tasks/${id}`);
    return response.data;
  }
};
