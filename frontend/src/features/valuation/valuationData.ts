export interface IndexPeItem {
  id: string;
  name: string;
  symbol: string;
  pe: number;
  maxVal: number;
  ticks: number[];
  medAvg: number;
  longAvg: number;
  shortTermSignal: 'Uptrend' | 'Downtrend' | 'Neutral';
  medTermSignal: 'Uptrend' | 'Downtrend' | 'Neutral';
  longTermSignal: 'Uptrend' | 'Downtrend' | 'Neutral';
  status: 'Undervalued' | 'Fair Value' | 'Stretched' | 'Overheated';
}

export const MAJOR_INDICES_PE: IndexPeItem[] = [
  {
    id: 'nifty50',
    name: 'NIFTY 50 PE',
    symbol: 'NIFTY50',
    pe: 20.55,
    maxVal: 40,
    ticks: [0, 10, 15, 20, 25, 30, 35, 40],
    medAvg: 21.20,
    longAvg: 22.40,
    shortTermSignal: 'Neutral',
    medTermSignal: 'Downtrend',
    longTermSignal: 'Downtrend',
    status: 'Fair Value',
  },
  {
    id: 'niftynext50',
    name: 'NIFTY NEXT 50 PE',
    symbol: 'NIFTYNEXT50',
    pe: 17.39,
    maxVal: 50,
    ticks: [0, 10, 15, 20, 25, 30, 35, 40, 50],
    medAvg: 19.80,
    longAvg: 21.50,
    shortTermSignal: 'Downtrend',
    medTermSignal: 'Downtrend',
    longTermSignal: 'Undervalued' as any,
    status: 'Undervalued',
  },
  {
    id: 'niftymidcap50',
    name: 'NIFTY MIDCAP 50 PE',
    symbol: 'NIFTYMID50',
    pe: 29.75,
    maxVal: 75,
    ticks: [0, 10, 15, 20, 25, 30, 35, 40, 50, 60, 70, 75],
    medAvg: 27.50,
    longAvg: 24.80,
    shortTermSignal: 'Uptrend',
    medTermSignal: 'Uptrend',
    longTermSignal: 'Stretched' as any,
    status: 'Stretched',
  },
  {
    id: 'niftysmallcap50',
    name: 'NIFTY SMALLCAP 50 PE',
    symbol: 'NIFTYSM50',
    pe: 32.84,
    maxVal: 100,
    ticks: [0, 10, 15, 20, 25, 30, 35, 40, 50, 60, 70, 75, 90, 100],
    medAvg: 28.00,
    longAvg: 25.20,
    shortTermSignal: 'Uptrend',
    medTermSignal: 'Uptrend',
    longTermSignal: 'Overheated' as any,
    status: 'Stretched',
  },
];

export const SECTORAL_INDICES_PE: IndexPeItem[] = [
  {
    id: 'niftyit',
    name: 'NIFTY IT PE',
    symbol: 'NIFTYIT',
    pe: 19.00,
    maxVal: 60,
    ticks: [0, 10, 15, 20, 25, 30, 35, 40, 50, 60],
    medAvg: 19.64,
    longAvg: 20.72,
    shortTermSignal: 'Uptrend',
    medTermSignal: 'Downtrend',
    longTermSignal: 'Downtrend',
    status: 'Undervalued',
  },
  {
    id: 'niftyauto',
    name: 'NIFTY AUTO PE',
    symbol: 'NIFTYAUTO',
    pe: 29.91,
    maxVal: 90,
    ticks: [0, 10, 15, 20, 25, 30, 35, 40, 50, 60, 70, 80, 90],
    medAvg: 28.40,
    longAvg: 26.50,
    shortTermSignal: 'Uptrend',
    medTermSignal: 'Uptrend',
    longTermSignal: 'Fair Value' as any,
    status: 'Fair Value',
  },
  {
    id: 'niftyinfra',
    name: 'NIFTY INFRA PE',
    symbol: 'NIFTYINFRA',
    pe: 22.00,
    maxVal: 60,
    ticks: [0, 10, 15, 20, 25, 30, 35, 40, 50, 60],
    medAvg: 21.50,
    longAvg: 20.10,
    shortTermSignal: 'Neutral',
    medTermSignal: 'Fair Value' as any,
    longTermSignal: 'Fair Value' as any,
    status: 'Fair Value',
  },
  {
    id: 'niftydefence',
    name: 'NIFTY INDIA DEFENCE PE',
    symbol: 'NIFTYDEFENCE',
    pe: 53.78,
    maxVal: 90,
    ticks: [0, 10, 15, 20, 25, 30, 35, 40, 50, 60, 70, 80, 90],
    medAvg: 48.20,
    longAvg: 38.00,
    shortTermSignal: 'Uptrend',
    medTermSignal: 'Uptrend',
    longTermSignal: 'Overheated' as any,
    status: 'Overheated',
  },
  {
    id: 'niftybank',
    name: 'NIFTY BANK PE',
    symbol: 'NIFTYBANK',
    pe: 15.80,
    maxVal: 50,
    ticks: [0, 10, 15, 20, 25, 30, 35, 40, 50],
    medAvg: 17.20,
    longAvg: 18.50,
    shortTermSignal: 'Downtrend',
    medTermSignal: 'Downtrend',
    longTermSignal: 'Undervalued' as any,
    status: 'Undervalued',
  },
  {
    id: 'niftypharma',
    name: 'NIFTY PHARMA PE',
    symbol: 'NIFTYPHARMA',
    pe: 34.12,
    maxVal: 60,
    ticks: [0, 10, 15, 20, 25, 30, 35, 40, 50, 60],
    medAvg: 32.80,
    longAvg: 30.40,
    shortTermSignal: 'Uptrend',
    medTermSignal: 'Uptrend',
    longTermSignal: 'Stretched' as any,
    status: 'Stretched',
  },
  {
    id: 'niftyfmcg',
    name: 'NIFTY FMCG PE',
    symbol: 'NIFTYFMCG',
    pe: 41.50,
    maxVal: 70,
    ticks: [0, 10, 15, 20, 25, 30, 35, 40, 50, 60, 70],
    medAvg: 43.00,
    longAvg: 39.80,
    shortTermSignal: 'Neutral',
    medTermSignal: 'Fair Value' as any,
    longTermSignal: 'Fair Value' as any,
    status: 'Fair Value',
  },
  {
    id: 'niftymetal',
    name: 'NIFTY METAL PE',
    symbol: 'NIFTYMETAL',
    pe: 14.20,
    maxVal: 50,
    ticks: [0, 10, 15, 20, 25, 30, 35, 40, 50],
    medAvg: 15.10,
    longAvg: 16.40,
    shortTermSignal: 'Downtrend',
    medTermSignal: 'Downtrend',
    longTermSignal: 'Undervalued' as any,
    status: 'Undervalued',
  },
];

export interface TrendPoint {
  date: string;
  pe: number;
}

export const NIFTY_IT_15D_TREND: TrendPoint[] = [
  { date: '29 Oct 2026', pe: 19.53 },
  { date: '30 Oct 2026', pe: 19.98 },
  { date: '02 Nov 2026', pe: 19.88 },
  { date: '03 Nov 2026', pe: 19.81 },
  { date: '04 Nov 2026', pe: 19.51 },
  { date: '05 Nov 2026', pe: 19.98 },
  { date: '06 Nov 2026', pe: 20.07 },
  { date: '08 Nov 2026', pe: 20.00 },
  { date: '09 Nov 2026', pe: 19.76 },
  { date: '11 Nov 2026', pe: 19.65 },
  { date: '12 Nov 2026', pe: 19.55 },
  { date: '13 Nov 2026', pe: 19.41 },
  { date: '16 Nov 2026', pe: 19.41 },
  { date: '17 Nov 2026', pe: 19.23 },
  { date: '18 Nov 2026', pe: 19.01 },
];

export const NIFTY_IT_24M_TREND: TrendPoint[] = [
  { date: 'Dec 2024', pe: 35.19 },
  { date: 'Jan 2025', pe: 33.22 },
  { date: 'Feb 2025', pe: 31.22 },
  { date: 'Mar 2025', pe: 28.09 },
  { date: 'Apr 2025', pe: 25.91 },
  { date: 'May 2025', pe: 27.76 },
  { date: 'Jun 2025', pe: 28.62 },
  { date: 'Jul 2025', pe: 27.34 },
  { date: 'Aug 2025', pe: 25.33 },
  { date: 'Sep 2025', pe: 25.53 },
  { date: 'Oct 2025', pe: 25.32 },
  { date: 'Nov 2025', pe: 25.81 },
  { date: 'Dec 2025', pe: 27.13 },
  { date: 'Jan 2026', pe: 27.10 },
  { date: 'Feb 2026', pe: 24.07 },
  { date: 'Mar 2026', pe: 21.00 },
  { date: 'Apr 2026', pe: 21.49 },
  { date: 'May 2026', pe: 19.65 },
  { date: 'Jun 2026', pe: 18.99 },
  { date: 'Jul 2026', pe: 18.62 },
  { date: 'Aug 2026', pe: 19.82 },
  { date: 'Sep 2026', pe: 18.50 },
  { date: 'Oct 2026', pe: 18.94 },
  { date: 'Nov 2026', pe: 19.64 },
];

export const NIFTY_IT_HISTORICAL_ANNUAL: TrendPoint[] = [
  { date: '2000', pe: 175.04 },
  { date: '2001', pe: 42.10 },
  { date: '2002', pe: 24.52 },
  { date: '2003', pe: 22.80 },
  { date: '2004', pe: 31.50 },
  { date: '2005', pe: 40.20 },
  { date: '2006', pe: 34.60 },
  { date: '2007', pe: 29.10 },
  { date: '2008', pe: 17.20 },
  { date: '2009', pe: 17.10 },
  { date: '2010', pe: 24.80 },
  { date: '2011', pe: 22.60 },
  { date: '2012', pe: 18.50 },
  { date: '2013', pe: 19.80 },
  { date: '2014', pe: 21.20 },
  { date: '2015', pe: 21.00 },
  { date: '2016', pe: 18.20 },
  { date: '2017', pe: 17.10 },
  { date: '2018', pe: 19.80 },
  { date: '2019', pe: 21.90 },
  { date: '2020', pe: 22.80 },
  { date: '2021', pe: 33.50 },
  { date: '2022', pe: 29.80 },
  { date: '2023', pe: 26.50 },
  { date: '2024', pe: 32.80 },
  { date: '2025', pe: 27.80 },
  { date: '2026', pe: 19.64 },
];

export interface HeatmapRow {
  year: number;
  months: (number | null)[]; // JAN = 0 to DEC = 11
}

export const NIFTY_IT_HEATMAP: HeatmapRow[] = [
  { year: 2026, months: [27.10, 24.07, 21.00, 21.49, 19.65, 18.99, 18.62, 19.82, 18.50, 18.94, 19.64, null] },
  { year: 2025, months: [33.22, 31.22, 28.09, 25.91, 27.76, 28.62, 27.34, 25.33, 25.53, 25.32, 25.81, 27.13] },
  { year: 2024, months: [30.26, 32.33, 30.36, 29.08, 28.00, 29.17, 32.39, 33.12, 34.73, 33.91, 33.55, 35.19] },
  { year: 2023, months: [26.35, 27.13, 25.52, 24.28, 24.75, 25.07, 26.03, 25.90, 27.39, 26.30, 25.96, 28.87] },
  { year: 2022, months: [37.02, 33.98, 35.01, 32.62, 27.77, 26.36, 25.28, 26.70, 25.02, 25.49, 26.60, 26.28] },
  { year: 2021, months: [34.14, 32.28, 31.88, 28.66, 28.43, 30.59, 31.33, 33.81, 36.70, 36.52, 35.83, 36.93] },
  { year: 2020, months: [24.50, 23.80, 18.20, 19.50, 20.80, 22.10, 23.40, 24.10, 24.80, 25.20, 25.80, 26.30] },
  { year: 2019, months: [20.80, 21.10, 21.50, 21.80, 22.10, 22.40, 22.20, 22.00, 21.80, 22.10, 22.40, 22.60] },
  { year: 2018, months: [18.90, 19.20, 19.50, 19.80, 20.10, 20.40, 20.20, 19.90, 19.70, 19.90, 20.10, 20.30] },
  { year: 2017, months: [16.20, 16.50, 16.80, 17.10, 17.40, 17.70, 17.50, 17.20, 17.00, 17.20, 17.40, 17.60] },
  { year: 2016, months: [17.40, 17.70, 18.00, 18.20, 18.50, 18.80, 18.60, 18.30, 18.10, 18.30, 18.50, 18.70] },
  { year: 2015, months: [20.10, 20.40, 20.70, 21.00, 21.30, 21.60, 21.40, 21.10, 20.90, 21.10, 21.30, 21.50] },
  { year: 2014, months: [20.30, 20.60, 20.90, 21.20, 21.50, 21.80, 21.60, 21.30, 21.10, 21.30, 21.50, 21.70] },
  { year: 2013, months: [18.90, 19.20, 19.50, 19.80, 20.10, 20.40, 20.20, 19.90, 19.70, 19.90, 20.10, 20.30] },
  { year: 2012, months: [17.60, 17.90, 18.20, 18.50, 18.80, 19.10, 18.90, 18.60, 18.40, 18.60, 18.80, 19.00] },
  { year: 2011, months: [23.80, 23.40, 23.10, 22.80, 22.60, 22.40, 22.20, 21.90, 21.70, 21.90, 22.10, 22.30] },
  { year: 2010, months: [24.20, 22.88, 24.12, 24.30, 23.18, 23.75, 24.39, 24.67, 25.96, 26.76, 26.23, 28.01] },
  { year: 2009, months: [10.51, 10.65, 10.89, 12.56, 14.44, 16.42, 17.49, 19.68, 21.39, 21.79, 22.20, 23.47] },
  { year: 2008, months: [20.37, 18.97, 17.67, 19.43, 21.33, 20.08, 17.52, 18.18, 16.95, 12.09, 11.11, 10.20] },
  { year: 2007, months: [34.01, 33.30, 31.02, 31.28, 30.57, 30.43, 29.25, 25.85, 25.34, 25.68, 22.29, 23.62] },
  { year: 2006, months: [40.35, 41.73, 44.28, 36.54, 33.45, 29.41, 31.00, 31.43, 32.54, 32.86, 31.99, 33.20] },
  { year: 2005, months: [33.59, 37.36, 50.93, 47.43, 47.66, 45.84, 44.64, 34.49, 33.69, 34.02, 36.00, 39.13] },
  { year: 2004, months: [34.28, 31.63, 29.96, 31.35, 30.45, 28.12, 29.34, 28.75, 30.07, 31.95, 34.47, 35.43] },
  { year: 2003, months: [24.14, 22.71, 21.70, 18.70, 16.94, 17.35, 19.19, 20.53, 24.37, 26.42, 29.14, 32.96] },
  { year: 2002, months: [34.52, 25.53, 26.57, 25.79, 24.85, 22.70, 20.61, 19.20, 20.88, 21.20, 23.29, 25.37] },
  { year: 2001, months: [87.10, 86.66, 55.48, 43.34, 43.73, 30.11, 26.82, 29.08, 23.09, 21.32, 26.17, 33.87] },
  { year: 2000, months: [193.04, 315.38, 296.50, 218.77, 144.68, 160.44, 135.40, 126.37, 153.23, 122.77, 127.78, 117.89] },
];

export interface InstitutionalFlow {
  label: string;
  fpiNet: number;
  diiNet: number;
  date: string;
}

export const INSTITUTIONAL_FLOWS: InstitutionalFlow[] = [
  { label: 'Today (Cash Market)', fpiNet: -1842.50, diiNet: 2490.15, date: '18 Nov 2026' },
  { label: 'Month-to-Date (MTD)', fpiNet: -14250.00, diiNet: 22180.50, date: 'Nov 2026' },
  { label: 'Year-to-Date (CY 2026)', fpiNet: -89400.00, diiNet: 245000.00, date: 'CY 2026' },
];

export interface IndexValuationBundle {
  trend15d: TrendPoint[];
  trend24m: TrendPoint[];
  historicalAnnual: TrendPoint[];
  heatmap: HeatmapRow[];
  thresholds?: {
    deepValue: number;
    undervalued: number;
    fairLow: number;
    fairHigh: number;
    premium: number;
  };
}

interface IndexProfileConfig {
  currentPe: number;
  medAvg: number;
  longAvg: number;
  thresholds: {
    deepValue: number;
    undervalued: number;
    fairLow: number;
    fairHigh: number;
    premium: number;
  };
  annualPe: Record<number, number>;
}

const INDEX_CONFIGS: Record<string, IndexProfileConfig> = {
  nifty50: {
    currentPe: 20.55,
    medAvg: 21.20,
    longAvg: 22.40,
    thresholds: { deepValue: 15.0, undervalued: 18.5, fairLow: 21.0, fairHigh: 24.0, premium: 28.0 },
    annualPe: {
      2000: 22.50, 2001: 16.80, 2002: 14.20, 2003: 16.90, 2004: 15.80, 2005: 17.50,
      2006: 20.10, 2007: 27.20, 2008: 12.40, 2009: 21.50, 2010: 23.20, 2011: 17.60,
      2012: 18.50, 2013: 17.80, 2014: 21.20, 2015: 21.80, 2016: 22.40, 2017: 25.90,
      2018: 26.10, 2019: 28.00, 2020: 33.80, 2021: 24.10, 2022: 21.70, 2023: 22.10,
      2024: 23.00, 2025: 21.80, 2026: 20.55,
    },
  },
  niftynext50: {
    currentPe: 17.39,
    medAvg: 19.80,
    longAvg: 21.50,
    thresholds: { deepValue: 14.0, undervalued: 17.0, fairLow: 19.5, fairHigh: 22.5, premium: 26.0 },
    annualPe: {
      2000: 19.80, 2001: 15.20, 2002: 13.50, 2003: 17.20, 2004: 16.40, 2005: 18.90,
      2006: 21.50, 2007: 26.80, 2008: 11.20, 2009: 19.80, 2010: 22.40, 2011: 16.50,
      2012: 17.90, 2013: 16.80, 2014: 20.50, 2015: 22.10, 2016: 23.40, 2017: 27.80,
      2018: 24.50, 2019: 23.80, 2020: 28.60, 2021: 22.40, 2022: 19.80, 2023: 18.90,
      2024: 20.20, 2025: 18.50, 2026: 17.39,
    },
  },
  niftymidcap50: {
    currentPe: 29.75,
    medAvg: 27.50,
    longAvg: 24.80,
    thresholds: { deepValue: 16.0, undervalued: 22.0, fairLow: 26.0, fairHigh: 30.0, premium: 35.0 },
    annualPe: {
      2000: 18.20, 2001: 12.80, 2002: 11.50, 2003: 16.40, 2004: 15.20, 2005: 19.80,
      2006: 22.40, 2007: 28.50, 2008: 9.60, 2009: 18.20, 2010: 21.50, 2011: 14.80,
      2012: 16.20, 2013: 15.10, 2014: 22.80, 2015: 24.50, 2016: 26.20, 2017: 32.40,
      2018: 27.10, 2019: 25.40, 2020: 29.80, 2021: 28.50, 2022: 25.20, 2023: 27.80,
      2024: 33.20, 2025: 31.40, 2026: 29.75,
    },
  },
  niftysmallcap50: {
    currentPe: 32.84,
    medAvg: 28.00,
    longAvg: 25.20,
    thresholds: { deepValue: 18.0, undervalued: 23.0, fairLow: 27.0, fairHigh: 32.0, premium: 38.0 },
    annualPe: {
      2000: 16.50, 2001: 11.20, 2002: 10.10, 2003: 15.80, 2004: 14.90, 2005: 20.40,
      2006: 23.80, 2007: 31.20, 2008: 8.40, 2009: 17.50, 2010: 20.80, 2011: 13.90,
      2012: 15.50, 2013: 14.20, 2014: 23.50, 2015: 25.80, 2016: 27.40, 2017: 35.80,
      2018: 26.50, 2019: 23.20, 2020: 27.50, 2021: 30.20, 2022: 26.80, 2023: 29.50,
      2024: 35.60, 2025: 34.10, 2026: 32.84,
    },
  },
  niftybank: {
    currentPe: 15.80,
    medAvg: 17.20,
    longAvg: 18.50,
    thresholds: { deepValue: 12.5, undervalued: 15.0, fairLow: 17.5, fairHigh: 20.5, premium: 24.0 },
    annualPe: {
      2000: 14.80, 2001: 12.50, 2002: 11.20, 2003: 13.80, 2004: 14.50, 2005: 16.80,
      2006: 18.50, 2007: 23.40, 2008: 10.80, 2009: 17.20, 2010: 19.50, 2011: 15.40,
      2012: 16.20, 2013: 14.50, 2014: 18.80, 2015: 19.20, 2016: 20.40, 2017: 27.50,
      2018: 25.80, 2019: 24.50, 2020: 21.80, 2021: 22.50, 2022: 18.20, 2023: 17.50,
      2024: 17.90, 2025: 16.80, 2026: 15.80,
    },
  },
  niftyauto: {
    currentPe: 29.91,
    medAvg: 28.40,
    longAvg: 26.50,
    thresholds: { deepValue: 18.0, undervalued: 23.0, fairLow: 27.0, fairHigh: 31.0, premium: 36.0 },
    annualPe: {
      2000: 17.50, 2001: 14.20, 2002: 15.80, 2003: 20.10, 2004: 18.40, 2005: 21.60,
      2006: 24.20, 2007: 27.50, 2008: 12.10, 2009: 22.40, 2010: 24.80, 2011: 19.50,
      2012: 20.80, 2013: 18.60, 2014: 25.40, 2015: 27.80, 2016: 29.50, 2017: 34.20,
      2018: 28.60, 2019: 22.40, 2020: 26.80, 2021: 29.40, 2022: 27.20, 2023: 28.50,
      2024: 32.10, 2025: 31.00, 2026: 29.91,
    },
  },
  niftyinfra: {
    currentPe: 22.00,
    medAvg: 21.50,
    longAvg: 20.10,
    thresholds: { deepValue: 15.0, undervalued: 18.5, fairLow: 21.5, fairHigh: 24.5, premium: 29.0 },
    annualPe: {
      2000: 18.50, 2001: 14.80, 2002: 13.90, 2003: 17.50, 2004: 19.20, 2005: 23.40,
      2006: 28.60, 2007: 36.50, 2008: 13.50, 2009: 22.80, 2010: 24.50, 2011: 17.20,
      2012: 16.80, 2013: 15.40, 2014: 18.90, 2015: 19.50, 2016: 20.20, 2017: 23.50,
      2018: 21.00, 2019: 19.80, 2020: 22.40, 2021: 23.80, 2022: 21.50, 2023: 22.40,
      2024: 24.10, 2025: 23.00, 2026: 22.00,
    },
  },
  niftydefence: {
    currentPe: 53.78,
    medAvg: 48.20,
    longAvg: 38.00,
    thresholds: { deepValue: 28.0, undervalued: 38.0, fairLow: 46.0, fairHigh: 54.0, premium: 62.0 },
    annualPe: {
      2000: 15.20, 2001: 13.80, 2002: 14.10, 2003: 16.50, 2004: 17.80, 2005: 19.50,
      2006: 21.20, 2007: 24.50, 2008: 14.80, 2009: 18.90, 2010: 21.00, 2011: 18.50,
      2012: 17.40, 2013: 16.20, 2014: 19.50, 2015: 21.80, 2016: 23.40, 2017: 25.80,
      2018: 24.20, 2019: 22.50, 2020: 26.40, 2021: 31.50, 2022: 36.80, 2023: 45.20,
      2024: 58.50, 2025: 56.20, 2026: 53.78,
    },
  },
  niftypharma: {
    currentPe: 34.12,
    medAvg: 32.80,
    longAvg: 30.40,
    thresholds: { deepValue: 22.0, undervalued: 28.0, fairLow: 32.0, fairHigh: 36.0, premium: 42.0 },
    annualPe: {
      2000: 24.50, 2001: 21.80, 2002: 20.50, 2003: 22.40, 2004: 24.10, 2005: 26.50,
      2006: 28.20, 2007: 29.80, 2008: 18.40, 2009: 25.20, 2010: 28.50, 2011: 26.40,
      2012: 28.90, 2013: 31.50, 2014: 38.20, 2015: 44.80, 2016: 38.50, 2017: 33.20,
      2018: 27.50, 2019: 25.80, 2020: 36.40, 2021: 35.80, 2022: 31.50, 2023: 32.80,
      2024: 36.50, 2025: 35.20, 2026: 34.12,
    },
  },
  niftyfmcg: {
    currentPe: 41.50,
    medAvg: 43.00,
    longAvg: 39.80,
    thresholds: { deepValue: 30.0, undervalued: 37.0, fairLow: 41.0, fairHigh: 45.0, premium: 50.0 },
    annualPe: {
      2000: 28.50, 2001: 26.20, 2002: 25.40, 2003: 27.80, 2004: 28.90, 2005: 32.40,
      2006: 34.80, 2007: 36.50, 2008: 26.80, 2009: 33.40, 2010: 36.20, 2011: 34.50,
      2012: 37.80, 2013: 38.50, 2014: 41.20, 2015: 42.80, 2016: 43.50, 2017: 46.80,
      2018: 48.50, 2019: 45.20, 2020: 44.80, 2021: 45.60, 2022: 43.20, 2023: 44.50,
      2024: 45.80, 2025: 43.50, 2026: 41.50,
    },
  },
  niftymetal: {
    currentPe: 14.20,
    medAvg: 15.10,
    longAvg: 16.40,
    thresholds: { deepValue: 10.0, undervalued: 13.0, fairLow: 15.0, fairHigh: 18.0, premium: 22.0 },
    annualPe: {
      2000: 11.50, 2001: 9.80, 2002: 10.40, 2003: 13.80, 2004: 15.20, 2005: 16.50,
      2006: 18.20, 2007: 22.40, 2008: 8.50, 2009: 16.80, 2010: 18.50, 2011: 13.20,
      2012: 12.80, 2013: 11.50, 2014: 14.80, 2015: 13.50, 2016: 17.20, 2017: 21.50,
      2018: 18.40, 2019: 14.20, 2020: 17.50, 2021: 15.80, 2022: 13.50, 2023: 14.80,
      2024: 16.20, 2025: 15.10, 2026: 14.20,
    },
  },
};

const HEATMAP_YEARS: number[] = Array.from({ length: 27 }, (_, i) => 2026 - i);

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function getIndexValuationData(indexId: string): IndexValuationBundle {
  // If NIFTY IT, return the exact benchmark dataset
  if (indexId === 'niftyit') {
    return {
      trend15d: NIFTY_IT_15D_TREND,
      trend24m: NIFTY_IT_24M_TREND,
      historicalAnnual: NIFTY_IT_HISTORICAL_ANNUAL,
      heatmap: NIFTY_IT_HEATMAP,
      thresholds: { deepValue: 15, undervalued: 20, fairLow: 24, fairHigh: 28, premium: 35 },
    };
  }

  const config = INDEX_CONFIGS[indexId] || INDEX_CONFIGS.nifty50;
  const { currentPe, annualPe, thresholds } = config;

  // 1. Generate Historical Annual Trend (2000 - 2026)
  const historicalAnnual: TrendPoint[] = [];
  for (let yr = 2000; yr <= 2026; yr++) {
    const val = yr === 2026 ? currentPe : annualPe[yr] ?? config.medAvg;
    historicalAnnual.push({
      date: `${yr}`,
      pe: Math.round(val * 100) / 100,
    });
  }

  // 2. Generate Heatmap rows (matching EXACT years)
  const heatmap: HeatmapRow[] = [];
  for (const year of HEATMAP_YEARS) {
    const base = annualPe[year] ?? config.medAvg;
    const months: (number | null)[] = [];

    for (let m = 0; m < 12; m++) {
      if (year === 2026) {
        if (m === 10) {
          // November 2026 = exact current PE
          months.push(currentPe);
        } else if (m > 10) {
          // December 2026 not occurred yet
          months.push(null);
        } else {
          // Jan - Oct 2026: smooth convergence towards current PE
          const progress = m / 10;
          const startVal = Math.round((annualPe[2025] ?? base) * 1.03 * 100) / 100;
          const val = startVal + (currentPe - startVal) * progress + Math.sin(m * 1.5) * 0.35;
          months.push(Math.round(val * 100) / 100);
        }
      } else if (year === 2008) {
        // Lehman Crash: starts high in Jan, drops into Oct/Nov trough
        const factors = [1.32, 1.25, 1.18, 1.12, 1.15, 1.08, 0.98, 0.95, 0.82, 0.72, 0.70, 0.78];
        const val = base * (factors[m] ?? 1.0);
        months.push(Math.round(val * 100) / 100);
      } else if (year === 2009) {
        // Post-crisis recovery: starts low in Jan, climbs steadily into Dec
        const factors = [0.72, 0.74, 0.78, 0.85, 0.95, 1.02, 1.06, 1.10, 1.14, 1.18, 1.22, 1.25];
        const val = base * (factors[m] ?? 1.0);
        months.push(Math.round(val * 100) / 100);
      } else {
        // Natural seasonal variance
        const seasonalFactor = 1.0 + Math.sin((m / 12) * Math.PI * 2) * 0.045 + Math.cos((m / 6) * Math.PI * 2) * 0.025;
        const val = base * seasonalFactor;
        months.push(Math.round(val * 100) / 100);
      }
    }
    heatmap.push({ year, months });
  }

  // 3. Generate 24-Month Trend (Dec 2024 to Nov 2026)
  const trend24m: TrendPoint[] = [];
  const row2024 = heatmap.find((r) => r.year === 2024);
  const row2025 = heatmap.find((r) => r.year === 2025);
  const row2026 = heatmap.find((r) => r.year === 2026);

  if (row2024 && row2024.months[11] !== null) {
    trend24m.push({ date: 'Dec 2024', pe: row2024.months[11] });
  }
  if (row2025) {
    for (let m = 0; m < 12; m++) {
      const v = row2025.months[m];
      if (v !== null && v !== undefined) {
        trend24m.push({ date: `${MONTH_NAMES[m]} 2025`, pe: v });
      }
    }
  }
  if (row2026) {
    for (let m = 0; m <= 10; m++) {
      const v = row2026.months[m];
      if (v !== null && v !== undefined) {
        trend24m.push({ date: `${MONTH_NAMES[m]} 2026`, pe: v });
      }
    }
  }

  // 4. Generate 15-Day Daily Trend (Oct 29 to Nov 18, 2026)
  const dayDates = [
    '29 Oct 2026', '30 Oct 2026', '02 Nov 2026', '03 Nov 2026', '04 Nov 2026',
    '05 Nov 2026', '06 Nov 2026', '08 Nov 2026', '09 Nov 2026', '11 Nov 2026',
    '12 Nov 2026', '13 Nov 2026', '16 Nov 2026', '17 Nov 2026', '18 Nov 2026'
  ];
  const deltaSteps = [0.45, 0.40, 0.32, 0.28, 0.18, 0.35, 0.42, 0.38, 0.25, 0.15, 0.10, 0.05, 0.05, -0.05, 0.00];
  const trend15d: TrendPoint[] = dayDates.map((date, idx) => ({
    date,
    pe: Math.round((currentPe + (deltaSteps[idx] ?? 0)) * 100) / 100,
  }));

  return {
    trend15d,
    trend24m,
    historicalAnnual,
    heatmap,
    thresholds,
  };
}
