import apiClient from '../../../lib/api';
import type {
  User,
  PaginatedResponse,
  CreateUserRequest,
  UpdateUserRequest,
  GenerateTokenResponse,
} from '../../../types';

export const adminService = {
  // List Users
  async getUsers(params?: { 
    page?: number; 
    search?: string; 
    role?: string;
    employee_type?: string;
  }): Promise<PaginatedResponse<User>> {
    const response = await apiClient.get<PaginatedResponse<User>>('/admin/users', { params });
    return response.data;
  },

  // Create User + Employee
  async createUser(data: CreateUserRequest): Promise<User> {
    const response = await apiClient.post<User>('/admin/users', data);
    return response.data;
  },

  // Update User + Employee
  async updateUser(id: number, data: UpdateUserRequest): Promise<User> {
    const response = await apiClient.put<User>(`/admin/users/${id}`, data);
    return response.data;
  },

  // Soft Delete User
  async deleteUser(id: number): Promise<{ message: string }> {
    const response = await apiClient.delete(`/admin/users/${id}`);
    return response.data;
  },

  // Restore User
  async restoreUser(id: number): Promise<User> {
    const response = await apiClient.post<User>(`/admin/users/${id}/restore`);
    return response.data;
  },

  // Generate Activation/Reset Token
  // Token yang sama bisa digunakan untuk setup password atau reset password
  async generateToken(id: number): Promise<GenerateTokenResponse> {
    const response = await apiClient.post<GenerateTokenResponse>(`/admin/users/${id}/generate-token`);
    return response.data;
  },
};
