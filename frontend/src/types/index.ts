export interface User {
  id: string;
  email: string;
  fullName: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  expiresInMs: number;
  user: User;
}

export type EngineStatus = 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' | 'DISABLED';

export interface EngineInfo {
  enabled: boolean;
  mode: 'disabled' | 'mock' | 'http';
  status: EngineStatus;
}

export interface Capabilities {
  engine: EngineInfo;
  features: Record<string, boolean>;
}

export interface Instrument {
  symbol: string;
  name: string;
  type: string;
  sector: string;
}

export interface PricePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PriceSeries {
  symbol: string;
  points: PricePoint[];
}

export interface Anomaly {
  symbol: string;
  date: string;
  direction: 'bullish' | 'bearish';
  returnPct: number;
  returnZ: number;
  label: string;
  confidence: string;
}

export interface Citation {
  n: number;
  title: string;
  source: string;
  url: string;
  publishedDate: string;
}

export interface Explanation {
  symbol: string;
  date: string;
  priceDirection: 'bullish' | 'bearish' | 'neutral';
  returnPct: number;
  returnZ: number;
  hasClearDriver: boolean;
  causeSummary: string;
  causalCategory: string;
  scope: string;
  newsDirection: 'bullish' | 'bearish' | 'neutral';
  signalAgreement: 'aligned' | 'diverging' | 'insufficient';
  confidence: 'high' | 'medium' | 'low';
  citations: Citation[];
}

export interface Horizon {
  days: number;
  sign: string;
  returnPct: number;
}

export interface MarketPulse {
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  dialLabel: string;
  dialScore: number;
  shortTerm: Horizon;
  mediumTerm: Horizon;
  longTerm: Horizon;
}

export interface SectorSnapshot {
  sector: string;
  sentiment: string;
  changePct: number;
  topSymbols: string[];
}

export interface ComparisonRow {
  symbol: string;
  latestPrice: number;
  changePct: number;
  regime: string;
  agreement: string;
}

export interface ComparisonData {
  rows: ComparisonRow[];
}

export interface Scoreboard {
  totalAnalyzed: number;
  explainedCount: number;
  unexplainedCount: number;
  summary: string;
}

export interface WatchlistItem {
  id: number;
  symbol: string;
  name?: string;
  regime?: string;
  agreement?: string;
  createdAt: string;
}

export interface QueryHistoryItem {
  id: number;
  rawQuery: string;
  intent: string;
  resolvedSymbols: string[];
  createdAt: string;
}

export interface UserPreference {
  defaultLookbackDays: number;
  reducedMotion: boolean;
}

export interface QueryResolveResult {
  intent: 'explain' | 'compare' | 'trend';
  symbols: string[];
  unmatchedMessage?: string;
}
