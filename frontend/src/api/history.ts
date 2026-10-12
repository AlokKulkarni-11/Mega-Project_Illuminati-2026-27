import { apiClient } from './client';
import { QueryHistoryItem } from '../types';

export const getHistoryApi = async (): Promise<QueryHistoryItem[]> => {
  const res = await apiClient.get<QueryHistoryItem[]>('/history');
  return res.data;
};

export const deleteHistoryItemApi = async (id: number): Promise<void> => {
  await apiClient.delete(`/history/${id}`);
};

export const clearHistoryApi = async (): Promise<void> => {
  await apiClient.delete('/history');
};
