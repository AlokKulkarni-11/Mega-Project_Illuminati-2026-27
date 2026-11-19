/**
 * Indian Equity Market Valuation Sync Telemetry (NSE / BSE)
 * Real-time daily pull interval schedule:
 * 1. Market Open: 09:15 AM IST
 * 2. Mid-Day Session: 12:30 PM IST
 * 3. End of Market (Close / Settlement): 03:30 PM IST
 */

export interface MarketIntervalTelemetry {
  lastUpdatedText: string;
  currentInterval: 'OPEN' | 'MIDDAY' | 'CLOSE';
  intervalLabel: string;
  nextIntervalLabel: string;
  nextIntervalTime: string;
  isLiveSession: boolean;
  marketStatusText: string;
}

export function getMarketIntervalTelemetry(nowDate: Date = new Date()): MarketIntervalTelemetry {
  // Compute current wall time in Indian Standard Time (UTC + 5:30)
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const utcMs = nowDate.getTime() + (nowDate.getTimezoneOffset() * 60000);
  const istDate = new Date(utcMs + istOffsetMs);

  const hours = istDate.getHours();
  const minutes = istDate.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  // Key Trading Session Milestones in IST minutes
  const openMinutes = 9 * 60 + 15;   // 09:15 AM IST (555 min)
  const midMinutes = 12 * 60 + 30;   // 12:30 PM IST (750 min)
  const closeMinutes = 15 * 60 + 30; // 03:30 PM IST (930 min)

  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatDate = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

  let currentInterval: 'OPEN' | 'MIDDAY' | 'CLOSE' = 'CLOSE';
  let intervalLabel = 'End of Market (03:30 PM)';
  let syncTimeStr = '03:30 PM';
  const syncDate = new Date(istDate);
  let nextIntervalLabel = 'Market Open';
  let nextIntervalTime = '09:15 AM IST';
  let isLiveSession = false;
  let marketStatusText = 'Market Closed';

  if (currentMinutes < openMinutes) {
    // Before market open: latest snapshot is from the previous session's close
    syncDate.setDate(syncDate.getDate() - 1);
    currentInterval = 'CLOSE';
    intervalLabel = 'Previous Close (03:30 PM)';
    syncTimeStr = '03:30 PM';
    nextIntervalLabel = 'Market Open';
    nextIntervalTime = 'Today at 09:15 AM IST';
    isLiveSession = false;
    marketStatusText = 'Pre-Market';
  } else if (currentMinutes >= openMinutes && currentMinutes < midMinutes) {
    // Session 1: Market Open active
    currentInterval = 'OPEN';
    intervalLabel = 'Market Open (09:15 AM)';
    syncTimeStr = '09:15 AM';
    nextIntervalLabel = 'Mid-Day Session';
    nextIntervalTime = 'Today at 12:30 PM IST';
    isLiveSession = true;
    marketStatusText = 'Market Open';
  } else if (currentMinutes >= midMinutes && currentMinutes < closeMinutes) {
    // Session 2: Mid-Day active
    currentInterval = 'MIDDAY';
    intervalLabel = 'Mid-Day of Market (12:30 PM)';
    syncTimeStr = '12:30 PM';
    nextIntervalLabel = 'End of Market';
    nextIntervalTime = 'Today at 03:30 PM IST';
    isLiveSession = true;
    marketStatusText = 'Market Open';
  } else {
    // Session 3: Post market close
    currentInterval = 'CLOSE';
    intervalLabel = 'End of Market (03:30 PM)';
    syncTimeStr = '03:30 PM';
    nextIntervalLabel = 'Market Open';
    nextIntervalTime = 'Next Trading Session at 09:15 AM IST';
    isLiveSession = false;
    marketStatusText = 'Market Closed';
  }

  return {
    lastUpdatedText: `${formatDate(syncDate)}, ${syncTimeStr}`,
    currentInterval,
    intervalLabel,
    nextIntervalLabel,
    nextIntervalTime,
    isLiveSession,
    marketStatusText,
  };
}
