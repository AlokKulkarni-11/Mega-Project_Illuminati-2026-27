import React from 'react';
import { EngineInfo } from '../types';

interface BannerProps {
  engine?: EngineInfo;
}

export const Banner: React.FC<BannerProps> = ({ engine }) => {
  if (!engine) return null;

  if (engine.mode === 'mock') {
    return (
      <aside aria-label="Engine Status" className="banner w-full bg-amber-50/60 dark:bg-amber-950/40 border-b border-amber-200/60 dark:border-amber-800/60 py-2 text-xs text-slate-600 dark:text-slate-300 transition-colors">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">Sample data — engine not connected</span>
            <span className="hidden sm:inline text-slate-500 dark:text-slate-400">— serving curated backtest fixtures (Nifty Bank 2025–2026).</span>
          </div>
          <span className="text-amber-800 dark:text-amber-200 text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-100/80 dark:bg-amber-900/60 px-2 py-0.5 rounded">
            MOCK MODE
          </span>
        </div>
      </aside>
    );
  }

  if (!engine.enabled || engine.mode === 'disabled') {
    return (
      <aside aria-label="Engine Status" className="banner w-full bg-rose-50/50 dark:bg-rose-950/40 border-b border-rose-200/60 dark:border-rose-800/60 py-2 text-xs text-slate-600 dark:text-slate-300 transition-colors">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full bg-rose-500" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">Market intelligence engine not connected</span>
            <span className="hidden sm:inline text-slate-500 dark:text-slate-400">— core causal screens hidden; financial calculators, watchlist, and glossary active.</span>
          </div>
          <span className="text-rose-700 dark:text-rose-300 text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded">
            OFFLINE
          </span>
        </div>
      </aside>
    );
  }

  return null;
};
