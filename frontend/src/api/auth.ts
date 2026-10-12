import { apiClient } from './client';
import { AuthResponse, User } from '../types';

export const loginApi = async (email: string, password: string): Promise<AuthResponse> => {
  const res = await apiClient.post<AuthResponse>('/auth/login', { email, password });
  return res.data;
};

export const registerApi = async (email: string, password: string, fullName?: string): Promise<AuthResponse> => {
  const res = await apiClient.post<AuthResponse>('/auth/register', { email, password, fullName });
  return res.data;
};

export const getMeApi = async (): Promise<User> => {
  const res = await apiClient.get<User>('/auth/me');
  return res.data;
};
