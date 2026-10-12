import { apiClient } from './client';
import { Capabilities } from '../types';

export const getCapabilitiesApi = async (): Promise<Capabilities> => {
  const res = await apiClient.get<Capabilities>('/capabilities');
  return res.data;
};
