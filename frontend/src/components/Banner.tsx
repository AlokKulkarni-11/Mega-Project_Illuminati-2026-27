import React from 'react';
import { EngineInfo } from '../types';

interface BannerProps {
  engine?: EngineInfo;
}

export const Banner: React.FC<BannerProps> = ({ engine }) => {
  if (!engine) return null;

  if (engine.mode === 'mock') {
    return (
      <aside aria-label="Engine Status" className="banner w-full bg-paper-inset border-b border-rule py-2 px-4 text-xs text-ink-soft flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="inline-block w-2 h-2 rounded-full bg-brass" />
          <span className="font-medium text-ink">Sample data — engine not connected</span>
          <span className="hidden sm:inline">— serving curated backtest fixtures (Nifty Bank 2025–2026).</span>
        </div>
        <span className="text-ink-soft text-[11px] font-mono uppercase tracking-wider">MOCK MODE</span>
      </aside>
    );
  }

  if (!engine.enabled || engine.mode === 'disabled') {
    return (
      <aside aria-label="Engine Status" className="banner w-full bg-paper-inset border-b border-rule py-2 px-4 text-xs text-ink-soft flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="inline-block w-2 h-2 rounded-full bg-loss" />
          <span className="font-medium text-ink">Market intelligence engine not connected</span>
          <span className="hidden sm:inline">— core causal screens hidden; financial calculators, watchlist, and glossary active.</span>
        </div>
        <span className="text-loss text-[11px] font-mono uppercase tracking-wider">OFFLINE</span>
      </aside>
    );
  }

  return null;
};
