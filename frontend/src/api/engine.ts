import { apiClient } from './client';
import {
  Instrument,
  PriceSeries,
  Anomaly,
  Explanation,
  MarketPulse,
  SectorSnapshot,
  ComparisonData,
  Scoreboard,
} from '../types';

export const getInstrumentsApi = async (): Promise<Instrument[]> => {
  const res = await apiClient.get<Instrument[]>('/engine/instruments');
  return res.data;
};

export const getPricesApi = async (symbol: string, days = 60): Promise<PriceSeries> => {
  const res = await apiClient.get<PriceSeries>(`/engine/instruments/${symbol}/prices`, {
    params: { days },
  });
  return res.data;
};

export const getAnomaliesApi = async (symbol: string, from?: string, to?: string): Promise<Anomaly[]> => {
  const res = await apiClient.get<Anomaly[]>(`/engine/instruments/${symbol}/anomalies`, {
    params: { from, to },
  });
  return res.data;
};

export const getExplanationApi = async (symbol: string, date?: string): Promise<Explanation> => {
  const res = await apiClient.get<Explanation>(`/engine/instruments/${symbol}/explanation`, {
    params: { date },
  });
  return res.data;
};

export const getPulseApi = async (): Promise<MarketPulse> => {
  const res = await apiClient.get<MarketPulse>('/engine/pulse');
  return res.data;
};

export const getSectorsApi = async (): Promise<SectorSnapshot[]> => {
  const res = await apiClient.get<SectorSnapshot[]>('/engine/sectors');
  return res.data;
};

export const getLeaderboardApi = async (limit = 10): Promise<Anomaly[]> => {
  const res = await apiClient.get<Anomaly[]>('/engine/leaderboard', {
    params: { limit },
  });
  return res.data;
};

export const getComparisonApi = async (symbols: string[]): Promise<ComparisonData> => {
  const res = await apiClient.get<ComparisonData>('/engine/compare', {
    params: { symbols: symbols.join(',') },
  });
  return res.data;
};

export const getScoreboardApi = async (): Promise<Scoreboard> => {
  const res = await apiClient.get<Scoreboard>('/engine/scoreboard');
  return res.data;
};
