import { apiClient } from './client';

export interface FeedbackPayload {
  symbol: string;
  anomalyDate: string;
  helpful: boolean;
  comment?: string;
}

export const submitFeedbackApi = async (payload: FeedbackPayload): Promise<void> => {
  await apiClient.post('/feedback', payload);
};
