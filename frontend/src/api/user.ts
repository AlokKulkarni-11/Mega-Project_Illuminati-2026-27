import { apiClient } from './client';
import { UserPreference } from '../types';

export const getPreferencesApi = async (): Promise<UserPreference> => {
  const res = await apiClient.get<UserPreference>('/user/preferences');
  return res.data;
};

export const updatePreferencesApi = async (prefs: UserPreference): Promise<UserPreference> => {
  const res = await apiClient.put<UserPreference>('/user/preferences', prefs);
  return res.data;
};
