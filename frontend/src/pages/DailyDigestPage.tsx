import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getPulseApi, getLeaderboardApi } from '../api/engine';
import { getWatchlistApi } from '../api/watchlist';
import { Anomaly, WatchlistItem } from '../types';

export const DailyDigestPage: React.FC = () => {
  const navigate = useNavigate();

  const { data: pulse } = useQuery({
    queryKey: ['pulse'],
    queryFn: getPulseApi,
  });

  const { data: leaderboard } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => getLeaderboardApi(5),
  });

  const { data: watchlist } = useQuery({
    queryKey: ['watchlist'],
    queryFn: getWatchlistApi,
  });

  const todayStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="digest-page pt-6 max-w-desk mx-auto print-page">
      {/* Newspaper / Ledger Header */}
      <div className="border-b-2 border-ink pb-4 mb-6">
        <div className="flex justify-between items-baseline text-xs text-ink-soft mb-1 font-mono uppercase">
          <span>Market Intelligence Digest</span>
          <span>{todayStr}</span>
        </div>
        <h1 className="font-serif text-4xl font-semibold text-ink">
          The Morning Case Briefing
        </h1>
        <p className="text-xs text-ink-soft mt-1 italic">
          Synthesized overview of benchmark sentiment, outsized price dislocations, and personal watchlist flags.
        </p>
      </div>

      {/* Story 1: Benchmark Regime Summary */}
      <div className="p-5 bg-paper-inset border border-rule my-6">
        <div className="text-[11px] font-mono uppercase tracking-wider text-brass mb-1">— Executive Summary</div>
        <div className="font-serif text-2xl font-medium text-ink mb-2">
          {pulse ? `Market Breadth Shows ${pulse.dialLabel}` : 'Evaluating Market Breadth…'}
        </div>
        <p className="text-xs text-ink-soft leading-relaxed">
          The aggregate breadth dial stands at <b className="text-ink tabular-nums">{pulse?.dialScore ?? 50}/100</b>, driven by {pulse?.bullishCount ?? 0} advances against {pulse?.bearishCount ?? 0} declines across primary monitored instruments. The short-term horizon (5-day) reflects {pulse?.shortTerm?.sign ?? 'neutral'} momentum, while long-term structural trends retain a {pulse?.longTerm?.sign ?? 'neutral'} bias.
        </p>
      </div>

      {/* Story 2: Top Dislocations */}
      <div className="my-8">
        <div className="text-xs font-mono uppercase tracking-wider text-ink-soft mb-3">— Key Dislocations of Note</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {leaderboard?.slice(0, 4).map((item: Anomaly, idx: number) => {
            const isGain = item.returnPct >= 0;
            return (
              <div
                key={idx}
                onClick={() => navigate(`/?symbol=${item.symbol}`)}
                className="p-4 border border-rule bg-paper-inset hover:border-ink cursor-pointer transition-colors"
              >
                <div className="flex justify-between items-baseline mb-1">
                  <span className="font-serif text-lg font-medium text-ink">{item.symbol}</span>
                  <span className={`text-xs font-semibold tabular-nums ${isGain ? 'text-gain' : 'text-loss'}`}>
                    {isGain ? '▲ +' : '▼ '}{item.returnPct}% (z={item.returnZ})
                  </span>
                </div>
                <div className="text-xs text-ink line-clamp-2 mt-1">{item.label}</div>
                <div className="mt-2 text-[10px] text-ink-soft font-mono uppercase">
                  Confidence: {item.confidence}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Story 3: Watchlist Status Strip */}
      <div className="my-8">
        <div className="text-xs font-mono uppercase tracking-wider text-ink-soft mb-3">— Watchlist Radar</div>
        {watchlist && watchlist.length > 0 ? (
          <div className="border-t border-ink">
            {watchlist.map((item: WatchlistItem) => (
              <div
                key={item.id}
                className="flex items-baseline justify-between py-2.5 border-b border-rule text-xs"
              >
                <span className="font-mono font-medium text-ink">{item.symbol}</span>
                <span className="text-ink-soft">{item.name || item.symbol}</span>
                <span className="capitalize font-serif text-ink">{item.regime || 'Monitoring'}</span>
                <span className="text-brass font-medium">{item.agreement || 'Neutral'}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 border border-rule bg-paper-inset text-xs text-ink-soft italic">
            No symbols added to watchlist yet. Add tickers from the research desk to receive tailored digest updates.
          </div>
        )}
      </div>

      {/* Footer Disclaimer */}
      <footer className="mt-12 pt-4 border-t border-rule text-xs text-ink-soft leading-relaxed">
        MarketMind is a research and explanation tool built on historical price and news data. It does not predict future prices and is not investment advice. Explanations are generated from retrieved sources and may be incomplete.
      </footer>
    </div>
  );
};
