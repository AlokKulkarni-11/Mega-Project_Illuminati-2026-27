import { apiClient } from './client';
import { QueryResolveResult } from '../types';

export const resolveQueryApi = async (q: string): Promise<QueryResolveResult> => {
  const res = await apiClient.post<QueryResolveResult>('/query/resolve', { q });
  return res.data;
};
