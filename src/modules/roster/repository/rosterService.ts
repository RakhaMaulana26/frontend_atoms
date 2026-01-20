import apiClient from '../../../lib/api';
import type { RosterPeriod, CreateRosterRequest } from '../../../types';

export const rosterService = {
  // Create Roster
  async createRoster(data: CreateRosterRequest): Promise<RosterPeriod> {
    const response = await apiClient.post<{message: string, data: RosterPeriod}>('/rosters', data);
    return response.data.data;
  },

  // Get Roster Detail
  async getRoster(id: number): Promise<RosterPeriod> {
    const response = await apiClient.get<RosterPeriod>(`/rosters/${id}`);
    return response.data;
  },

  // Publish Roster
  async publishRoster(id: number): Promise<RosterPeriod> {
    const response = await apiClient.post<{message: string, data: RosterPeriod}>(`/rosters/${id}/publish`);
    return response.data.data;
  },

  // List Rosters (optional, not in docs but useful)
  async getRosters(params?: { month?: number; year?: number }): Promise<RosterPeriod[]> {
    const response = await apiClient.get<RosterPeriod[]>('/rosters', { params });
    return response.data;
  },
};
