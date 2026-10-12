import { apiClient } from './client';
import { WatchlistItem } from '../types';

export const getWatchlistApi = async (): Promise<WatchlistItem[]> => {
  const res = await apiClient.get<WatchlistItem[]>('/watchlist');
  return res.data;
};

export const addToWatchlistApi = async (symbol: string): Promise<WatchlistItem> => {
  const res = await apiClient.post<WatchlistItem>('/watchlist', { symbol });
  return res.data;
};

export const removeFromWatchlistApi = async (symbol: string): Promise<void> => {
  await apiClient.delete(`/watchlist/${symbol}`);
};

export const checkWatchlistApi = async (symbol: string): Promise<boolean> => {
  const res = await apiClient.get<{ inWatchlist: boolean }>('/watchlist/check', {
    params: { symbol },
  });
  return res.data.inWatchlist;
};
