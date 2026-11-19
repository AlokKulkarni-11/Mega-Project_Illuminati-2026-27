import { apiClient } from './client';
import { WatchlistItem, StockDirectoryItem } from '../types';

const LOCAL_WATCHLIST_STORAGE_KEY = 'marketmind_watchlist_storage';

const STOCK_FALLBACKS: Record<string, Partial<WatchlistItem>> = {
  // Flagship Core USP Stocks (with Sentiment & Causal Agreement)
  SBIN: { name: 'State Bank of India', price: 814.50, change: 12.30, changePercent: 1.51, dayHigh: 832.00, dayLow: 810.20, volume: 14200000, sector: 'Banking & Financial Services', hasSentimentUsp: true },
  TCS: { name: 'Tata Consultancy Services Ltd', price: 2342.70, change: -36.80, changePercent: -1.55, dayHigh: 2385.60, dayLow: 2327.70, volume: 2470000, sector: 'Information Technology', hasSentimentUsp: true },
  HDFCBANK: { name: 'HDFC Bank Limited', price: 1748.20, change: 8.50, changePercent: 0.49, dayHigh: 1756.00, dayLow: 1731.50, volume: 9800000, sector: 'Banking & Financial Services', hasSentimentUsp: true },
  NIFTY: { name: 'Nifty 50 Benchmark Index', price: 24420.00, change: 65.40, changePercent: 0.28, dayHigh: 24510.00, dayLow: 24380.00, volume: 0, sector: 'Benchmark Index', hasSentimentUsp: true },
  NIFTYBANK: { name: 'Nifty Bank Index', price: 52470.80, change: 180.20, changePercent: 0.36, dayHigh: 52650.00, dayLow: 52200.00, volume: 0, sector: 'Banking & Financial Services', hasSentimentUsp: true },

  // Jio / Reliance
  RELIANCE: { name: 'Reliance Industries Limited', price: 1375.60, change: 12.60, changePercent: 0.92, dayHigh: 1382.50, dayLow: 1349.70, volume: 14434000, sector: 'Energy & Conglomerate', hasSentimentUsp: false },
  JIOFIN: { name: 'Jio Financial Services Ltd', price: 318.40, change: 4.20, changePercent: 1.34, dayHigh: 322.00, dayLow: 314.50, volume: 18900000, sector: 'Financial Services', hasSentimentUsp: false },

  // Banking & Financial Services
  ICICIBANK: { name: 'ICICI Bank Limited', price: 1260.00, change: 9.80, changePercent: 0.78, dayHigh: 1268.00, dayLow: 1248.00, volume: 8100000, sector: 'Banking & Financial Services', hasSentimentUsp: false },
  KOTAKBANK: { name: 'Kotak Mahindra Bank Ltd', price: 1735.60, change: -11.20, changePercent: -0.64, dayHigh: 1752.00, dayLow: 1728.00, volume: 2400000, sector: 'Banking & Financial Services', hasSentimentUsp: false },
  AXISBANK: { name: 'Axis Bank Limited', price: 1162.30, change: 7.40, changePercent: 0.64, dayHigh: 1170.00, dayLow: 1150.00, volume: 4600000, sector: 'Banking & Financial Services', hasSentimentUsp: false },
  BAJFINANCE: { name: 'Bajaj Finance Limited', price: 6820.00, change: -28.00, changePercent: -0.39, dayHigh: 6890.00, dayLow: 6780.00, volume: 980000, sector: 'Financial Services', hasSentimentUsp: false },
  BAJAJFINSV: { name: 'Bajaj Finserv Limited', price: 1612.40, change: 8.60, changePercent: 0.54, dayHigh: 1625.00, dayLow: 1598.00, volume: 1450000, sector: 'Financial Services', hasSentimentUsp: false },
  INDUSINDBK: { name: 'IndusInd Bank Limited', price: 1045.10, change: -6.50, changePercent: -0.62, dayHigh: 1058.00, dayLow: 1038.00, volume: 2800000, sector: 'Banking & Financial Services', hasSentimentUsp: false },
  BANKBARODA: { name: 'Bank of Baroda', price: 248.50, change: 3.20, changePercent: 1.30, dayHigh: 252.00, dayLow: 245.00, volume: 9200000, sector: 'Banking & Financial Services', hasSentimentUsp: false },
  PNB: { name: 'Punjab National Bank', price: 104.20, change: 1.80, changePercent: 1.76, dayHigh: 106.00, dayLow: 102.50, volume: 24500000, sector: 'Banking & Financial Services', hasSentimentUsp: false },
  CANBK: { name: 'Canara Bank', price: 102.80, change: 1.40, changePercent: 1.38, dayHigh: 104.50, dayLow: 101.20, volume: 12000000, sector: 'Banking & Financial Services', hasSentimentUsp: false },
  IDFCFIRSTB: { name: 'IDFC First Bank Ltd', price: 68.40, change: 0.85, changePercent: 1.26, dayHigh: 69.50, dayLow: 67.20, volume: 19800000, sector: 'Banking & Financial Services', hasSentimentUsp: false },
  HDFCLIFE: { name: 'HDFC Life Insurance Co Ltd', price: 678.50, change: 5.20, changePercent: 0.77, dayHigh: 684.00, dayLow: 672.00, volume: 3200000, sector: 'Insurance & Financials', hasSentimentUsp: false },
  SBILIFE: { name: 'SBI Life Insurance Co Ltd', price: 1540.00, change: 14.50, changePercent: 0.95, dayHigh: 1555.00, dayLow: 1528.00, volume: 1400000, sector: 'Insurance & Financials', hasSentimentUsp: false },

  // Information Technology
  INFY: { name: 'Infosys Limited', price: 1860.50, change: 14.20, changePercent: 0.77, dayHigh: 1872.00, dayLow: 1845.00, volume: 5400000, sector: 'Information Technology', hasSentimentUsp: false },
  WIPRO: { name: 'Wipro Limited', price: 562.30, change: -2.40, changePercent: -0.42, dayHigh: 568.00, dayLow: 558.00, volume: 6200000, sector: 'Information Technology', hasSentimentUsp: false },
  HCLTECH: { name: 'HCL Technologies Limited', price: 1824.50, change: 16.80, changePercent: 0.93, dayHigh: 1838.00, dayLow: 1810.00, volume: 2600000, sector: 'Information Technology', hasSentimentUsp: false },
  TECHM: { name: 'Tech Mahindra Limited', price: 1680.00, change: 11.50, changePercent: 0.69, dayHigh: 1695.00, dayLow: 1665.00, volume: 1900000, sector: 'Information Technology', hasSentimentUsp: false },
  LTIM: { name: 'LTIMindtree Limited', price: 5940.20, change: 48.00, changePercent: 0.81, dayHigh: 5990.00, dayLow: 5890.00, volume: 680000, sector: 'Information Technology', hasSentimentUsp: false },
  PERSISTENT: { name: 'Persistent Systems Limited', price: 5420.00, change: 65.00, changePercent: 1.21, dayHigh: 5480.00, dayLow: 5360.00, volume: 450000, sector: 'Information Technology', hasSentimentUsp: false },
  COFORGE: { name: 'Coforge Limited', price: 7850.00, change: 82.00, changePercent: 1.06, dayHigh: 7920.00, dayLow: 7780.00, volume: 380000, sector: 'Information Technology', hasSentimentUsp: false },
  TATAELXSI: { name: 'Tata Elxsi Limited', price: 6890.00, change: -42.00, changePercent: -0.61, dayHigh: 6960.00, dayLow: 6840.00, volume: 290000, sector: 'Information Technology', hasSentimentUsp: false },

  // Tata Group Stocks
  TATAMOTORS: { name: 'Tata Motors Limited', price: 785.40, change: -4.30, changePercent: -0.54, dayHigh: 796.00, dayLow: 778.00, volume: 8400000, sector: 'Automobile', hasSentimentUsp: false },
  TATASTEEL: { name: 'Tata Steel Limited', price: 148.60, change: 1.20, changePercent: 0.81, dayHigh: 151.00, dayLow: 147.20, volume: 18200000, sector: 'Metals & Mining', hasSentimentUsp: false },
  TATAPOWER: { name: 'Tata Power Company Ltd', price: 398.00, change: 4.50, changePercent: 1.14, dayHigh: 404.00, dayLow: 393.50, volume: 9200000, sector: 'Power & Utilities', hasSentimentUsp: false },
  TATACONSUM: { name: 'Tata Consumer Products Ltd', price: 965.00, change: 6.80, changePercent: 0.71, dayHigh: 974.00, dayLow: 958.00, volume: 2100000, sector: 'Consumer Goods / FMCG', hasSentimentUsp: false },
  TITAN: { name: 'Titan Company Limited', price: 3280.00, change: 22.00, changePercent: 0.67, dayHigh: 3310.00, dayLow: 3255.00, volume: 1100000, sector: 'Consumer Discretionary', hasSentimentUsp: false },
  TRENT: { name: 'Trent Limited', price: 6420.00, change: 84.00, changePercent: 1.33, dayHigh: 6490.00, dayLow: 6350.00, volume: 1650000, sector: 'Retail & Consumer', hasSentimentUsp: false },

  // Automobile
  MARUTI: { name: 'Maruti Suzuki India Ltd', price: 11240.00, change: -45.00, changePercent: -0.40, dayHigh: 11350.00, dayLow: 11180.00, volume: 520000, sector: 'Automobile', hasSentimentUsp: false },
  'M&M': { name: 'Mahindra & Mahindra Ltd', price: 2890.50, change: 32.00, changePercent: 1.12, dayHigh: 2920.00, dayLow: 2865.00, volume: 3400000, sector: 'Automobile', hasSentimentUsp: false },
  'BAJAJ-AUTO': { name: 'Bajaj Auto Limited', price: 9450.00, change: -28.00, changePercent: -0.30, dayHigh: 9540.00, dayLow: 9380.00, volume: 410000, sector: 'Automobile', hasSentimentUsp: false },
  EICHERMOT: { name: 'Eicher Motors Limited', price: 4820.00, change: 38.00, changePercent: 0.80, dayHigh: 4870.00, dayLow: 4780.00, volume: 620000, sector: 'Automobile', hasSentimentUsp: false },

  // Adani Group
  ADANIENT: { name: 'Adani Enterprises Limited', price: 2840.00, change: 34.00, changePercent: 1.21, dayHigh: 2880.00, dayLow: 2810.00, volume: 2900000, sector: 'Conglomerate', hasSentimentUsp: false },
  ADANIPORTS: { name: 'Adani Ports & SEZ', price: 1180.00, change: 12.00, changePercent: 1.03, dayHigh: 1195.00, dayLow: 1168.00, volume: 4800000, sector: 'Infrastructure & Logistics', hasSentimentUsp: false },
  ADANIGREEN: { name: 'Adani Green Energy Ltd', price: 1520.00, change: 24.00, changePercent: 1.60, dayHigh: 1545.00, dayLow: 1495.00, volume: 2100000, sector: 'Renewable Energy', hasSentimentUsp: false },
  ADANIPOWER: { name: 'Adani Power Limited', price: 560.00, change: 8.50, changePercent: 1.54, dayHigh: 572.00, dayLow: 552.00, volume: 6800000, sector: 'Power & Utilities', hasSentimentUsp: false },

  // FMCG, Retail & Consumer
  ITC: { name: 'ITC Limited', price: 472.60, change: 2.10, changePercent: 0.45, dayHigh: 476.00, dayLow: 470.50, volume: 7300000, sector: 'Consumer Goods / FMCG', hasSentimentUsp: false },
  HINDUNILVR: { name: 'Hindustan Unilever Ltd', price: 2430.80, change: -12.40, changePercent: -0.51, dayHigh: 2455.00, dayLow: 2420.00, volume: 1800000, sector: 'Consumer Goods / FMCG', hasSentimentUsp: false },
  NESTLEIND: { name: 'Nestle India Limited', price: 2290.00, change: 11.00, changePercent: 0.48, dayHigh: 2315.00, dayLow: 2275.00, volume: 890000, sector: 'Consumer Goods / FMCG', hasSentimentUsp: false },
  BRITANNIA: { name: 'Britannia Industries Ltd', price: 4980.00, change: 25.00, changePercent: 0.50, dayHigh: 5020.00, dayLow: 4950.00, volume: 540000, sector: 'Consumer Goods / FMCG', hasSentimentUsp: false },
  ZOMATO: { name: 'Zomato Limited', price: 268.40, change: 5.60, changePercent: 2.13, dayHigh: 274.00, dayLow: 262.50, volume: 22000000, sector: 'Internet & Consumer Services', hasSentimentUsp: false },
  DMART: { name: 'Avenue Supermarts (DMart)', price: 3840.00, change: 18.00, changePercent: 0.47, dayHigh: 3875.00, dayLow: 3810.00, volume: 650000, sector: 'Retail & Consumer', hasSentimentUsp: false },

  // Infrastructure, Telecom & Energy
  LT: { name: 'Larsen & Toubro Limited', price: 3560.00, change: 24.50, changePercent: 0.69, dayHigh: 3590.00, dayLow: 3535.00, volume: 1800000, sector: 'Capital Goods & Infrastructure', hasSentimentUsp: false },
  BHARTIARTL: { name: 'Bharti Airtel Limited', price: 1580.40, change: 11.40, changePercent: 0.73, dayHigh: 1595.00, dayLow: 1568.00, volume: 3900000, sector: 'Telecommunications', hasSentimentUsp: false },
  NTPC: { name: 'NTPC Limited', price: 382.50, change: 4.80, changePercent: 1.27, dayHigh: 388.00, dayLow: 378.00, volume: 8900000, sector: 'Power & Utilities', hasSentimentUsp: false },
  POWERGRID: { name: 'Power Grid Corp of India', price: 318.20, change: 2.60, changePercent: 0.82, dayHigh: 322.00, dayLow: 315.00, volume: 7800000, sector: 'Power & Utilities', hasSentimentUsp: false },
  COALINDIA: { name: 'Coal India Limited', price: 425.00, change: 3.50, changePercent: 0.83, dayHigh: 430.00, dayLow: 421.00, volume: 6400000, sector: 'Mining & Energy', hasSentimentUsp: false },
  ONGC: { name: 'Oil & Natural Gas Corp', price: 262.40, change: 2.10, changePercent: 0.81, dayHigh: 266.00, dayLow: 260.00, volume: 9800000, sector: 'Oil & Gas', hasSentimentUsp: false },

  // Pharma & Healthcare
  SUNPHARMA: { name: 'Sun Pharmaceutical Ind', price: 1780.20, change: 8.90, changePercent: 0.50, dayHigh: 1795.00, dayLow: 1768.00, volume: 1400000, sector: 'Healthcare & Pharma', hasSentimentUsp: false },
  CIPLA: { name: 'Cipla Limited', price: 1520.00, change: 9.50, changePercent: 0.63, dayHigh: 1535.00, dayLow: 1508.00, volume: 1650000, sector: 'Healthcare & Pharma', hasSentimentUsp: false },
  DRREDDY: { name: "Dr. Reddy's Laboratories", price: 1240.00, change: -6.00, changePercent: -0.48, dayHigh: 1255.00, dayLow: 1230.00, volume: 920000, sector: 'Healthcare & Pharma', hasSentimentUsp: false },
  APOLLOHOSP: { name: 'Apollo Hospitals Enterprise', price: 6980.00, change: 75.00, changePercent: 1.09, dayHigh: 7040.00, dayLow: 6910.00, volume: 540000, sector: 'Healthcare Services', hasSentimentUsp: false },

  // Aerospace & Defence
  HAL: { name: 'Hindustan Aeronautics Ltd', price: 4320.00, change: 52.00, changePercent: 1.22, dayHigh: 4380.00, dayLow: 4280.00, volume: 1900000, sector: 'Aerospace & Defence', hasSentimentUsp: false },
  BEL: { name: 'Bharat Electronics Ltd', price: 298.50, change: 3.40, changePercent: 1.15, dayHigh: 304.00, dayLow: 295.00, volume: 8200000, sector: 'Aerospace & Defence', hasSentimentUsp: false },
  MAZDOCK: { name: 'Mazagon Dock Shipbuilders', price: 4120.00, change: 64.00, changePercent: 1.58, dayHigh: 4180.00, dayLow: 4050.00, volume: 1200000, sector: 'Aerospace & Defence', hasSentimentUsp: false },
};

function getLocalWatchlist(): WatchlistItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_WATCHLIST_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveItemToLocalWatchlist(item: WatchlistItem): void {
  try {
    const list = getLocalWatchlist().filter(i => i.symbol.toUpperCase() !== item.symbol.toUpperCase());
    list.unshift(item);
    localStorage.setItem(LOCAL_WATCHLIST_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

function removeItemFromLocalWatchlist(symbol: string): void {
  try {
    const list = getLocalWatchlist().filter(i => i.symbol.toUpperCase() !== symbol.toUpperCase());
    localStorage.setItem(LOCAL_WATCHLIST_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

export const getWatchlistApi = async (): Promise<WatchlistItem[]> => {
  try {
    const res = await apiClient.get<WatchlistItem[]>('/watchlist');
    if (Array.isArray(res.data) && res.data.length > 0) {
      localStorage.setItem(LOCAL_WATCHLIST_STORAGE_KEY, JSON.stringify(res.data));
      return res.data;
    }
    const local = getLocalWatchlist();
    if (local.length > 0) {
      return local;
    }
    return res.data || [];
  } catch (err) {
    console.warn('Backend getWatchlist failed, falling back to local storage:', err);
    return getLocalWatchlist();
  }
};

export const addToWatchlistApi = async (symbol: string): Promise<WatchlistItem> => {
  const clean = symbol.toUpperCase().trim();
  try {
    const res = await apiClient.post<WatchlistItem>('/watchlist', { symbol: clean });
    saveItemToLocalWatchlist(res.data);
    return res.data;
  } catch (err: any) {
    console.warn('Backend addToWatchlist failed or already added, maintaining local resilient state:', err);
    // If backend reports duplicate, return existing item
    const existing = getLocalWatchlist().find(i => i.symbol.toUpperCase() === clean);
    if (existing) {
      return existing;
    }

    const meta = STOCK_FALLBACKS[clean] || {};
    const fallbackItem: WatchlistItem = {
      id: Date.now(),
      symbol: clean,
      name: meta.name || clean,
      regime: clean === 'SBIN' || clean === 'TCS' || clean === 'HDFCBANK' || clean === 'NIFTY' ? 'Bullish' : 'Monitoring',
      agreement: 'aligned',
      createdAt: new Date().toISOString(),
      price: meta.price ?? 1450.00,
      change: meta.change ?? 8.20,
      changePercent: meta.changePercent ?? 0.57,
      dayHigh: meta.dayHigh ?? 1465.00,
      dayLow: meta.dayLow ?? 1435.00,
      volume: meta.volume ?? 1200000,
      sector: meta.sector || 'Equities',
      hasSentimentUsp: Boolean(meta.hasSentimentUsp || clean === 'SBIN' || clean === 'TCS' || clean === 'HDFCBANK' || clean === 'NIFTY' || clean === 'NIFTYBANK'),
    };
    saveItemToLocalWatchlist(fallbackItem);
    return fallbackItem;
  }
};

export const removeFromWatchlistApi = async (symbol: string): Promise<void> => {
  const clean = symbol.toUpperCase().trim();
  try {
    await apiClient.delete(`/watchlist/${clean}`);
  } catch (err) {
    console.warn('Backend removeFromWatchlist failed, proceeding with local removal:', err);
  }
  removeItemFromLocalWatchlist(clean);
};

export const checkWatchlistApi = async (symbol: string): Promise<boolean> => {
  const clean = symbol.toUpperCase().trim();
  try {
    const res = await apiClient.get<{ inWatchlist: boolean }>('/watchlist/check', {
      params: { symbol: clean },
    });
    return res.data.inWatchlist;
  } catch {
    return getLocalWatchlist().some(i => i.symbol.toUpperCase() === clean);
  }
};

export const searchStockDirectoryApi = async (query = ''): Promise<StockDirectoryItem[]> => {
  try {
    const res = await apiClient.get<StockDirectoryItem[]>('/watchlist/directory', {
      params: { q: query },
    });
    if (Array.isArray(res.data) && res.data.length > 0) {
      return res.data;
    }
  } catch (err) {
    console.warn('Backend searchStockDirectory failed, using fallback directory:', err);
  }

  const q = query.trim().toUpperCase();
  const allKnown: StockDirectoryItem[] = Object.entries(STOCK_FALLBACKS).map(([sym, meta]) => ({
    symbol: sym,
    name: meta.name || sym,
    basePrice: meta.price ?? 1200.0,
    sector: meta.sector || 'Equities',
    hasSentimentUsp: Boolean(meta.hasSentimentUsp),
  }));

  if (!q) {
    // Show USP stocks first, followed by key sector leaders
    return allKnown
      .sort((a, b) => (a.hasSentimentUsp === b.hasSentimentUsp ? 0 : a.hasSentimentUsp ? -1 : 1))
      .slice(0, 20);
  }

  const matches = allKnown.filter(s => {
    const sym = s.symbol.toUpperCase();
    const nm = s.name.toUpperCase();
    const sec = s.sector.toUpperCase();
    return sym.includes(q) || nm.includes(q) || sec.includes(q);
  });

  // Prioritize exact prefix match, then USP stocks, then alphabetical
  return matches.sort((a, b) => {
    const aStarts = a.symbol.startsWith(q) || a.name.toUpperCase().startsWith(q);
    const bStarts = b.symbol.startsWith(q) || b.name.toUpperCase().startsWith(q);
    if (aStarts !== bStarts) return aStarts ? -1 : 1;
    if (a.hasSentimentUsp !== b.hasSentimentUsp) return a.hasSentimentUsp ? -1 : 1;
    return a.symbol.localeCompare(b.symbol);
  });
};
