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
   * Create new roster template for a month
   * POST /rosters
   */
  async createRoster(data: { month: number; year: number }): Promise<RosterPeriod> {
    const response = await apiClient.post<{ message: string; data: RosterPeriod }>('/rosters', data);
    return response.data.data;
  },

  /**
   * Get detailed roster information with all assignments
   * GET /rosters/:id
   */
  async getRoster(rosterId: number): Promise<RosterPeriod> {
    const response = await apiClient.get<RosterPeriod>(`/rosters/${rosterId}`);
    return response.data;
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
   */
  async publishRoster(rosterId: number): Promise<PublishRosterResponse> {
    const response = await apiClient.post<PublishRosterResponse>(`/rosters/${rosterId}/publish`);
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
  }
};
