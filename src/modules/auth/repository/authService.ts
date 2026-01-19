import apiClient from '../../../lib/api';
import type {
  LoginCredentials,
  LoginResponse,
  VerifyTokenRequest,
  VerifyTokenResponse,
  SetPasswordRequest,
  SetPasswordResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
} from '../../../types';

export const authService = {
  // Login
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },

  // Verify Token (activation/reset)
  async verifyToken(data: VerifyTokenRequest): Promise<VerifyTokenResponse> {
    const response = await apiClient.post<VerifyTokenResponse>('/auth/verify-token', data);
    return response.data;
  },

  // Set Password with Token
  async setPassword(data: SetPasswordRequest): Promise<SetPasswordResponse> {
    const response = await apiClient.post<SetPasswordResponse>('/auth/set-password', data);
    return response.data;
  },

  // Forgot Password - Request reset code
  async forgotPassword(data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
    const response = await apiClient.post<ForgotPasswordResponse>('/auth/forgot-password', data);
    return response.data;
  },

  // Logout
  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },
};
