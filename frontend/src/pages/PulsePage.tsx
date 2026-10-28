import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getPulseApi, getSectorsApi, getLeaderboardApi, getScoreboardApi } from '../api/engine';
import { MarketGauge } from '../components/MarketGauge';
import { Scoreboard } from '../components/Scoreboard';
import { GlossaryTerm } from '../components/GlossaryTerm';
import { Anomaly, SectorSnapshot } from '../types';

export const PulsePage: React.FC = () => {
  const navigate = useNavigate();

  const { data: pulse, isLoading: loadingPulse } = useQuery({
    queryKey: ['pulse'],
    queryFn: getPulseApi,
  });

  const { data: sectors, isLoading: loadingSectors } = useQuery({
    queryKey: ['sectors'],
    queryFn: getSectorsApi,
  });

  const { data: leaderboard, isLoading: loadingLeaderboard } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => getLeaderboardApi(10),
  });

  const { data: scoreboard } = useQuery({
    queryKey: ['scoreboard'],
    queryFn: getScoreboardApi,
  });

  return (
    <div className="pulse-page pt-6 max-w-desk mx-auto">
      {/* Header */}
      <div className="flex items-baseline justify-between border-b border-rule pb-3 mb-6">
        <div>
          <h1 className="font-serif text-3xl font-medium text-ink">Market Pulse & Intelligence</h1>
          <p className="text-xs text-ink-soft mt-1">Multi-horizon directional breadth, sector sentiment, and anomaly ranking</p>
        </div>
        <span className="text-xs font-mono text-ink-soft uppercase">— Macro Desk</span>
      </div>

      {/* Model Accuracy Scoreboard */}
      <Scoreboard scoreboard={scoreboard} />

      {/* Section 1: Market Meter & Horizons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8 items-stretch">
        {/* Brass Needle Dial */}
        <div>
          <div className="text-xs uppercase tracking-wide text-ink-soft mb-2 font-mono">— Equity Market Sentiment Dial</div>
          {loadingPulse ? (
            <div className="h-44 flex items-center justify-center text-xs italic text-ink-soft bg-paper-inset border border-rule">
              Reviewing the case file…
            </div>
          ) : pulse ? (
            <MarketGauge score={pulse.dialScore} label={pulse.dialLabel} />
          ) : null}
        </div>

        {/* Horizons Directional Strip & Counts */}
        <div className="flex flex-col justify-between p-4 bg-paper-inset border border-rule">
          <div>
            <div className="text-xs uppercase tracking-wide text-ink-soft mb-3 font-mono">— Horizon Return Sign</div>
            <div className="space-y-3">
              {[
                { label: 'Short-Term Horizon', data: pulse?.shortTerm },
                { label: 'Medium-Term Horizon', data: pulse?.mediumTerm },
                { label: 'Long-Term Horizon', data: pulse?.longTerm },
              ].map((h, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-rule pb-2 text-xs">
                  <span className="text-ink-soft">{h.label} ({h.data?.days}d)</span>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`font-semibold tabular-nums ${
                        h.data?.sign === 'bullish' ? 'text-gain' : 'text-loss'
                      }`}
                    >
                      {h.data?.sign === 'bullish' ? '▲ Bullish' : '▼ Bearish'} ({(h.data?.returnPct ?? 0) > 0 ? '+' : ''}{h.data?.returnPct ?? 0}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Breadth Counts */}
          <div className="mt-4 pt-3 border-t border-rule flex items-center justify-between text-xs text-ink-soft">
            <div>Bullish: <b className="text-gain tabular-nums">{pulse?.bullishCount ?? 0}</b></div>
            <div>Bearish: <b className="text-loss tabular-nums">{pulse?.bearishCount ?? 0}</b></div>
            <div>Neutral: <b className="text-ink tabular-nums">{pulse?.neutralCount ?? 0}</b></div>
          </div>
        </div>
      </div>

      {/* Section 2: Sector Snapshot Tiles */}
      <div className="my-10">
        <div className="text-xs uppercase tracking-wide text-ink-soft mb-3 font-mono">— Sector Sentiment Snapshots</div>
        {loadingSectors ? (
          <div className="py-6 text-center text-xs italic text-ink-soft">Reviewing the case file…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {sectors?.map((s: SectorSnapshot) => {
              const isGain = s.changePct >= 0;
              return (
                <div
                  key={s.sector}
                  className="p-3.5 border border-rule bg-paper-inset hover:border-ink transition-colors cursor-pointer"
                  onClick={() => {
                    if (s.topSymbols && s.topSymbols.length > 0) {
                      navigate(`/?symbol=${s.topSymbols[0]}`);
                    }
                  }}
                >
                  <div className="text-xs font-semibold text-ink line-clamp-1">{s.sector}</div>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className={`text-xs font-semibold ${isGain ? 'text-gain' : 'text-loss'}`}>
                      {isGain ? '▲' : '▼'} {s.changePct > 0 ? '+' : ''}{s.changePct}%
                    </span>
                    <span className="text-[11px] uppercase tracking-wider text-ink-soft font-mono">
                      {s.sentiment}
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-rule text-[11px] text-ink-soft flex gap-1.5 flex-wrap">
                    {s.topSymbols?.map((sym) => (
                      <span key={sym} className="font-mono text-ink hover:text-brass">
                        {sym}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 3: Anomaly Leaderboard */}
      <div className="my-10">
        <div className="text-xs uppercase tracking-wide text-ink-soft mb-3 font-mono">
          — Most Unusual Moves (Ranked by <GlossaryTerm termKey="z-score">|z-score|</GlossaryTerm>)
        </div>
        {loadingLeaderboard ? (
          <div className="py-6 text-center text-xs italic text-ink-soft">Reviewing the case file…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-ink">
                  <th className="text-left font-semibold text-ink-soft py-2 pr-4">Symbol</th>
                  <th className="text-left font-semibold text-ink-soft py-2 pr-4">Event Date</th>
                  <th className="text-right font-semibold text-ink-soft py-2 pr-4">Return %</th>
                  <th className="text-right font-semibold text-ink-soft py-2 pr-4">|z-score|</th>
                  <th className="text-left font-semibold text-ink-soft py-2 pr-4">Attributed Cause</th>
                  <th className="text-left font-semibold text-ink-soft py-2">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard?.map((item: Anomaly, idx: number) => {
                  const isGain = item.returnPct >= 0;
                  return (
                    <tr
                      key={idx}
                      className="border-b border-rule hover:bg-paper cursor-pointer transition-colors"
                      onClick={() => navigate(`/?symbol=${item.symbol}`)}
                    >
                      <td className="py-2.5 pr-4 font-mono font-medium text-ink">{item.symbol}</td>
                      <td className="py-2.5 pr-4 text-ink-soft tabular-nums">{item.date}</td>
                      <td className={`py-2.5 pr-4 text-right font-semibold tabular-nums ${isGain ? 'text-gain' : 'text-loss'}`}>
                        {isGain ? '+' : ''}{item.returnPct}%
                      </td>
                      <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-brass font-bold">
                        {Math.abs(item.returnZ).toFixed(2)}
                      </td>
                      <td className="py-2.5 pr-4 text-ink">{item.label}</td>
                      <td className="py-2.5">
                        <span className={`px-1.5 py-0.5 text-[10px] rounded-none uppercase font-mono ${
                          item.confidence === 'unconfirmed'
                            ? 'bg-paper text-loss border border-rule'
                            : 'bg-[rgb(var(--c-tint))] text-gain'
                        }`}>
                          {item.confidence}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
