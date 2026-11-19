import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  getWatchlistApi,
  addToWatchlistApi,
  removeFromWatchlistApi,
  searchStockDirectoryApi,
} from '../api/watchlist';
import { useToast } from '../components/Toast';
import { WatchlistItem, StockDirectoryItem, Capabilities } from '../types';

interface WatchlistPageProps {
  capabilities?: Capabilities;
}

const POPULAR_SUGGESTIONS = [
  { symbol: 'SBIN', name: 'SBI', usp: true, sector: 'Banking' },
  { symbol: 'TCS', name: 'TCS', usp: true, sector: 'IT' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', usp: true, sector: 'Banking' },
  { symbol: 'NIFTYBANK', name: 'Nifty Bank', usp: true, sector: 'Index' },
  { symbol: 'NIFTY', name: 'Nifty 50', usp: true, sector: 'Index' },
  { symbol: 'RELIANCE', name: 'Reliance', usp: false, sector: 'Energy' },
  { symbol: 'INFY', name: 'Infosys', usp: false, sector: 'IT' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', usp: false, sector: 'Banking' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors', usp: false, sector: 'Auto' },
  { symbol: 'ITC', name: 'ITC', usp: false, sector: 'FMCG' },
  { symbol: 'LT', name: 'L&T', usp: false, sector: 'Infra' },
  { symbol: 'BHARTIARTL', name: 'Airtel', usp: false, sector: 'Telecom' },
  { symbol: 'MARUTI', name: 'Maruti', usp: false, sector: 'Auto' },
  { symbol: 'SUNPHARMA', name: 'Sun Pharma', usp: false, sector: 'Pharma' },
  { symbol: 'TATASTEEL', name: 'Tata Steel', usp: false, sector: 'Metals' },
  { symbol: 'ZOMATO', name: 'Zomato', usp: false, sector: 'Consumer' },
  { symbol: 'HAL', name: 'HAL Defence', usp: false, sector: 'Defence' },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance', usp: false, sector: 'Finance' },
];

const SECTOR_FILTERS = [
  { id: 'ALL', label: 'All Stocks' },
  { id: 'USP', label: '⚡ AI Causal Synthesis' },
  { id: 'Banking', label: 'Banking & Finance' },
  { id: 'IT', label: 'Information Technology' },
  { id: 'Auto', label: 'Automobile' },
  { id: 'Consumer', label: 'Consumer & FMCG' },
  { id: 'Energy', label: 'Energy & Power' },
  { id: 'Metals', label: 'Metals & Mining' },
  { id: 'Pharma', label: 'Healthcare' },
  { id: 'Defence', label: 'Defence & Infra' },
];

export const WatchlistPage: React.FC<WatchlistPageProps> = ({ capabilities }) => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [newSymbol, setNewSymbol] = useState('');
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<string>('ALL');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const isEngineEnabled = capabilities?.engine?.enabled ?? true;

  // Watchlist query
  const { data: watchlist, isLoading } = useQuery({
    queryKey: ['watchlist'],
    queryFn: getWatchlistApi,
  });

  const filteredWatchlist = (watchlist || []).filter((item: WatchlistItem) => {
    if (selectedSectorFilter === 'ALL') return true;
    if (selectedSectorFilter === 'USP') return item.hasSentimentUsp;
    const sec = (item.sector || '').toLowerCase();
    const query = selectedSectorFilter.toLowerCase();
    return sec.includes(query);
  });

  // Stock search autocomplete query
  const { data: searchResults } = useQuery({
    queryKey: ['stockDirectory', newSymbol],
    queryFn: () => searchStockDirectoryApi(newSymbol),
    enabled: isDropdownOpen,
    staleTime: 60000,
  });

  // Close autocomplete on click outside or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const addMutation = useMutation({
    mutationFn: addToWatchlistApi,
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      setNewSymbol('');
      setIsDropdownOpen(false);
      showToast(`${item.symbol} added to watchlist with live quotes`, 'success');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Could not add symbol to watchlist';
      showToast(msg, 'error');
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeFromWatchlistApi,
    onSuccess: (_, sym) => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      showToast(`${sym} removed from watchlist`, 'info');
    },
    onError: () => {
      showToast('Could not remove symbol', 'error');
    },
  });

  const handleAddSymbol = (sym: string) => {
    const clean = sym.trim().toUpperCase();
    if (clean) {
      addMutation.mutate(clean);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSymbol.trim()) {
      handleAddSymbol(newSymbol);
    }
  };

  const handleRefreshQuotes = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      showToast('Live stock quotes refreshed', 'success');
    } catch {
      showToast('Failed to refresh live quotes', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatPrice = (val?: number) => {
    if (val === undefined || val === null) return '—';
    return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatVolume = (vol?: number) => {
    if (!vol) return '—';
    if (vol >= 10000000) return `${(vol / 10000000).toFixed(2)} Cr`;
    if (vol >= 100000) return `${(vol / 100000).toFixed(2)} L`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(1)} K`;
    return vol.toLocaleString('en-IN');
  };

  return (
    <div className="watchlist-page pt-6 pb-20 max-w-desk mx-auto">
      {/* Header & Live Telemetry Banner */}
      <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-5 mb-6 flex-wrap gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800 px-3 py-1 rounded-full mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Live Market Telemetry Active (NSE / BSE)
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight page-heading">
            Personal Watchlist &amp; Market Monitor
          </h1>
          <p className="text-xs page-subheading mt-1 max-w-3xl leading-relaxed">
            Monitor real-time prices, 24h market swings, and volume for <b>all Indian equities</b>. MarketMind’s proprietary <b>AI Narrative Agreement &amp; Causal Sentiment Engine (our core USP)</b> is actively indexed on flagship assets.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefreshQuotes}
          disabled={isRefreshing || isLoading}
          className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
          title="Pull latest live quotes from market feed"
        >
          <svg
            className={`w-3.5 h-3.5 text-amber-600 dark:text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {isRefreshing ? 'Pulling Live Quotes…' : 'Refresh Quotes'}
        </button>
      </div>

      {/* USP Distinction Notice Ribbon */}
      <div className="mb-6 p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 flex items-start sm:items-center justify-between flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-200">
          <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center shrink-0">
            ⚡
          </span>
          <span>
            <b>MarketMind USP:</b> Causal explanation and narrative agreement are powered by vector news sentiment on covered assets (<span className="font-mono font-bold">SBI / SBIN, TCS, HDFC Bank, NIFTY</span>). All other added stocks receive real-time live market pricing and quotes!
          </span>
        </div>
      </div>

      {/* Search & Add Stock Form with Autocomplete */}
      <div className="mb-6">
        <form onSubmit={handleFormSubmit} className="relative flex items-center gap-2 max-w-xl">
          <div className="relative flex-1" ref={searchContainerRef}>
            <input
              type="text"
              value={newSymbol}
              onChange={(e) => {
                setNewSymbol(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsDropdownOpen(false);
                }
              }}
              placeholder="Search ticker or company (e.g. DABUR, RELIANCE, JIO, TCS)…"
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-xs"
            />
            {newSymbol && (
              <button
                type="button"
                onClick={() => {
                  setNewSymbol('');
                  setIsDropdownOpen(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
              >
                ✕
              </button>
            )}

            {/* Live Autocomplete Dropdown */}
            {isDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {/* 1. Matching Stock Results with Prices & Badges */}
                {searchResults && searchResults.length > 0 ? (
                  searchResults.map((stock: StockDirectoryItem) => {
                    const displayTicker = stock.symbol.endsWith('.NS') ? stock.symbol : `${stock.symbol}.NS`;
                    return (
                      <button
                        key={stock.symbol}
                        type="button"
                        onClick={() => {
                          handleAddSymbol(stock.symbol);
                          setIsDropdownOpen(false);
                        }}
                        className="w-full text-left p-3.5 hover:bg-amber-50/60 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-between group cursor-pointer"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-amber-600 transition-colors">
                              {displayTicker}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                              NSE
                            </span>
                            {stock.hasSentimentUsp && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                ⚡ AI Causal USP
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-sm mt-0.5 font-medium">
                            {stock.name} · <span className="italic">{stock.sector}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100">
                            {stock.basePrice > 0 ? formatPrice(stock.basePrice) : 'Live Quote'}
                          </span>
                          <span className="block text-[11px] font-bold text-amber-600 dark:text-amber-400 group-hover:underline">
                            + Add to Watchlist
                          </span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  newSymbol.trim() && (
                    <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400 italic">
                      No matching indexed stocks for "{newSymbol}". You can add it directly below.
                    </div>
                  )
                )}

                {/* 2. Direct Add fallback option at bottom if query typed */}
                {newSymbol.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      handleAddSymbol(newSymbol);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors flex items-center justify-between border-t border-slate-200 dark:border-slate-800 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                        + Add <b className="text-amber-600 dark:text-amber-400">"{newSymbol.trim().toUpperCase()}"</b> directly from NSE live feed
                      </span>
                    </div>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      Add Now →
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={addMutation.isPending || !newSymbol.trim()}
            className="px-5 py-3 rounded-2xl font-bold text-xs bg-amber-400 text-slate-950 hover:bg-amber-500 transition-all shadow-xs disabled:opacity-50 cursor-pointer shrink-0"
          >
            {addMutation.isPending ? 'Adding…' : '+ Add Symbol'}
          </button>
        </form>

        {/* Quick Add Suggestion Chips */}
        <div className="flex items-center gap-1.5 flex-wrap mt-3 text-xs">
          <span className="text-[11px] font-bold text-slate-400 mr-1">Quick Add:</span>
          {POPULAR_SUGGESTIONS.map((item) => (
            <button
              key={item.symbol}
              type="button"
              onClick={() => handleAddSymbol(item.symbol)}
              disabled={addMutation.isPending}
              className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-xl border transition-all cursor-pointer ${
                item.usp
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-100'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              title={item.usp ? `${item.symbol} has AI Sentiment USP` : `Add ${item.symbol}`}
            >
              {item.usp && <span className="mr-1">⚡</span>}
              {item.symbol}
            </button>
          ))}
        </div>
      </div>

      {/* Sector Category Filters */}
      {watchlist && watchlist.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-4 scrollbar-none text-xs">
          <span className="text-[11px] font-bold text-slate-400 mr-1 shrink-0">Filter Universe:</span>
          {SECTOR_FILTERS.map((filter) => {
            const active = selectedSectorFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setSelectedSectorFilter(filter.id)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Watchlist Table */}
      {isLoading ? (
        <div className="py-16 text-center text-xs italic text-slate-500 calc-card border rounded-3xl">
          Pulling live stock telemetry &amp; synchronizing watchlist…
        </div>
      ) : filteredWatchlist && filteredWatchlist.length > 0 ? (
        <div className="calc-card border rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  <th className="text-left py-3.5 px-4">Ticker / Asset</th>
                  <th className="text-left py-3.5 px-4">Company &amp; Sector</th>
                  <th className="text-right py-3.5 px-4">Live Price</th>
                  <th className="text-right py-3.5 px-4">24h Change</th>
                  <th className="text-right py-3.5 px-4 hidden md:table-cell">Day Range</th>
                  <th className="text-right py-3.5 px-4 hidden lg:table-cell">Volume</th>
                  <th className="text-center py-3.5 px-4">MarketMind Role / Causal Synthesis</th>
                  <th className="text-right py-3.5 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredWatchlist.map((item: WatchlistItem) => {
                  const isPositive = (item.change ?? 0) >= 0;
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Symbol & Link */}
                      <td className="py-3.5 px-4 font-mono font-bold text-sm">
                        <div className="flex items-center gap-1.5">
                          {item.hasSentimentUsp ? (
                            <Link
                              to={`/?symbol=${item.symbol}`}
                              className="text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                              title="Click to view deep-dive Causal Explanation dossier in Research Desk"
                            >
                              <span>{item.symbol}</span>
                              <span className="text-xs">⚡</span>
                            </Link>
                          ) : (
                            <span className="text-slate-900 dark:text-slate-100">{item.symbol}</span>
                          )}
                        </div>
                      </td>

                      {/* Company Name & Sector */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {item.name || item.symbol}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {item.sector || 'Indian Equities (NSE)'}
                        </div>
                      </td>

                      {/* Live Price */}
                      <td className="py-3.5 px-4 text-right font-mono font-black text-sm text-slate-950 dark:text-slate-100 tabular-nums">
                        {formatPrice(item.price)}
                      </td>

                      {/* 24h Change */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold tabular-nums">
                        {item.change !== undefined && item.change !== null ? (
                          <span
                            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-xs ${
                              isPositive
                                ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400'
                                : 'bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {isPositive ? '+' : ''}
                            {item.change >= 0 ? '▲' : '▼'} {Math.abs(item.change).toFixed(2)} (
                            {isPositive ? '+' : ''}
                            {item.changePercent?.toFixed(2)}%)
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Day Range */}
                      <td className="py-3.5 px-4 text-right font-mono text-[11px] text-slate-600 dark:text-slate-400 hidden md:table-cell tabular-nums">
                        {item.dayLow && item.dayHigh ? (
                          <span>
                            ₹{item.dayLow.toFixed(1)} – ₹{item.dayHigh.toFixed(1)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Volume */}
                      <td className="py-3.5 px-4 text-right font-mono text-[11px] text-slate-600 dark:text-slate-400 hidden lg:table-cell tabular-nums">
                        {formatVolume(item.volume)}
                      </td>

                      {/* MarketMind USP / Sentiment Status */}
                      <td className="py-3.5 px-4 text-center">
                        {item.hasSentimentUsp ? (
                          <div className="inline-flex flex-col items-center gap-1">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                              ⚡ AI Causal Synthesis &amp; Sentiment
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap justify-center mt-0.5">
                              {item.regime && (
                                <span className="px-2 py-0.2 rounded-md text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                  {item.regime}
                                </span>
                              )}
                              {item.agreement && (
                                <span
                                  className={`px-2 py-0.2 rounded-md text-[9px] font-black uppercase tracking-wider ${
                                    item.agreement === 'aligned'
                                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                      : item.agreement === 'diverging'
                                      ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                  }`}
                                >
                                  {item.agreement}
                                </span>
                              )}
                            </div>
                            <Link
                              to={`/?symbol=${item.symbol}`}
                              className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-0.5 mt-0.5"
                            >
                              <span>Open Causal Dossier →</span>
                            </Link>
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-center gap-1">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              📊 Live Real-Time Market Quote
                            </span>
                            <span className="text-[10px] text-slate-400 text-center max-w-[190px] leading-tight">
                              Technical quote active · Causal synthesis reserved for tracked USP assets
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Remove Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => removeMutation.mutate(item.symbol)}
                          disabled={removeMutation.isPending}
                          className="text-rose-600 dark:text-rose-400 hover:text-rose-700 font-semibold cursor-pointer transition-colors p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title={`Remove ${item.symbol} from watchlist`}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : watchlist && watchlist.length > 0 ? (
        <div className="py-14 border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-3xl text-center">
          <div className="text-sm font-semibold page-heading mb-1">
            No stocks in your watchlist match the "{selectedSectorFilter}" category.
          </div>
          <p className="text-xs page-subheading mb-4">
            You have {watchlist.length} stock{watchlist.length > 1 ? 's' : ''} in your total watchlist.
          </p>
          <button
            type="button"
            onClick={() => setSelectedSectorFilter('ALL')}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-400 text-slate-950 hover:bg-amber-500 transition-all cursor-pointer shadow-xs"
          >
            View All Watchlist Stocks
          </button>
        </div>
      ) : (
        <div className="py-16 border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-3xl text-center">
          <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3 text-lg font-bold">
            +
          </div>
          <h3 className="font-serif text-lg font-bold page-heading mb-1">
            Your Watchlist is Currently Empty
          </h3>
          <p className="text-xs page-subheading max-w-md mx-auto mb-5">
            Add any Indian equity stock above (e.g. TATAMOTORS, ICICIBANK, ITC, SBIN, TCS) to pull live prices and track market regimes.
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap max-w-lg mx-auto">
            {POPULAR_SUGGESTIONS.slice(0, 6).map((item) => (
              <button
                key={item.symbol}
                type="button"
                onClick={() => handleAddSymbol(item.symbol)}
                className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-amber-400 hover:text-slate-950 transition-all cursor-pointer shadow-xs"
              >
                + {item.symbol}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
