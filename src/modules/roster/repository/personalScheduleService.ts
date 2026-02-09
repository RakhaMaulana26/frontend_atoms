import apiClient from '../../../lib/api';

export interface PersonalScheduleDay {
  date: string;
  day_of_week: string;
  shift_id: number | null;
  shift_name: string;
}

export interface PersonalScheduleData {
  roster_id?: number;
  month: number;
  year: number;
  status?: string;
  employee: {
    id: number;
    name: string;
    employee_type: string;
  };
  schedule: PersonalScheduleDay[];
}

export interface PersonalScheduleResponse {
  data: PersonalScheduleData;
}

export const personalScheduleService = {
  getMySchedule: async (month: number, year: number) => {
    const response = await apiClient.get<PersonalScheduleResponse>('/employee/my-schedule', {
      params: { month, year }
    });
    return response.data;
  },
  
  getMyScheduleByRoster: async (rosterId: number) => {
    const response = await apiClient.get<PersonalScheduleResponse>(`/employee/roster/${rosterId}/my-schedule`);
    return response.data;
  }
};
