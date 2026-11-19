import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getPulseApi, getSectorsApi, getLeaderboardApi, getScoreboardApi } from '../api/engine';
import { MarketGauge } from '../components/MarketGauge';
import { Scoreboard } from '../components/Scoreboard';
import { GlossaryTerm } from '../components/GlossaryTerm';
import { PeMeterGauge } from '../components/PeMeterGauge';
import { PeTrendChart } from '../components/PeTrendChart';
import { PeHeatMap } from '../components/PeHeatMap';
import { useToast } from '../components/Toast';
import {
  MAJOR_INDICES_PE,
  SECTORAL_INDICES_PE,
  INSTITUTIONAL_FLOWS,
  IndexPeItem,
  getIndexValuationData,
} from '../features/valuation/valuationData';
import { getMarketIntervalTelemetry, MarketIntervalTelemetry } from '../features/valuation/marketSyncTelemetry';
import { Anomaly, SectorSnapshot } from '../types';

export const PulsePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [selectedSectorId, setSelectedSectorId] = useState<string>('nifty50');
  const [trendPeriod, setTrendPeriod] = useState<'15d' | '24m' | 'hist'>('15d');
  const [telemetry, setTelemetry] = useState<MarketIntervalTelemetry>(getMarketIntervalTelemetry);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    // Re-evaluate interval telemetry every 30 seconds to capture session milestones (09:15, 12:30, 15:30 IST)
    const timer = setInterval(() => {
      setTelemetry(getMarketIntervalTelemetry());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pulse'] }),
        queryClient.invalidateQueries({ queryKey: ['sectors'] }),
        queryClient.invalidateQueries({ queryKey: ['leaderboard'] }),
        queryClient.invalidateQueries({ queryKey: ['scoreboard'] }),
      ]);
      setTelemetry(getMarketIntervalTelemetry());
      showToast('Live market valuation & telemetry pulled successfully.', 'success');
    } catch {
      showToast('Failed to pull live market data.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

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

  // All supported market indices (benchmarks + sectoral)
  const allIndices = useMemo(() => [...MAJOR_INDICES_PE, ...SECTORAL_INDICES_PE], []);

  // Find active index item
  const selectedSector =
    allIndices.find((s) => s.id === selectedSectorId) ||
    MAJOR_INDICES_PE[0];

  // Dynamic valuation bundle for the selected index
  const valuationBundle = useMemo(
    () => getIndexValuationData(selectedSectorId),
    [selectedSectorId]
  );

  // Active trend data
  const currentTrendData =
    trendPeriod === '15d'
      ? valuationBundle.trend15d
      : trendPeriod === '24m'
      ? valuationBundle.trend24m
      : valuationBundle.historicalAnnual;

  const currentTrendTitle =
    trendPeriod === '15d'
      ? `${selectedSector.name} - Last 15 Days P/E Ratio Trends Chart`
      : trendPeriod === '24m'
      ? `${selectedSector.name} - Last 24 Months P/E Ratio Trends Chart`
      : `${selectedSector.name} - Historical P/E Chart (2000–2026)`;

  return (
    <div className="pulse-page pt-6 pb-20 max-w-desk mx-auto">
      {/* FinLive Style Equity Market Meter Hero Header */}
      <section className="mb-10 calc-card border rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 dark:border-slate-800 pb-5 mb-5">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800 px-3 py-1 rounded-full mb-2">
              <span className={`w-2 h-2 rounded-full ${telemetry.isLiveSession ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`}></span>
              Equity Market Meter — BETA
            </div>
            <h1 className="text-3xl font-black tracking-tight page-heading">
              Indian Equity Market Valuation Meter
            </h1>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-1.5">
            <div className="flex items-center gap-2 text-xs font-mono font-bold page-heading tab-track border px-3 py-1.5 rounded-xl shadow-xs">
              <span className={`w-2 h-2 rounded-full ${telemetry.isLiveSession ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
              Last Updated {telemetry.lastUpdatedText}
              <span className="text-[10px] font-sans font-bold text-amber-800 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-800 ml-1">
                {telemetry.intervalLabel}
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              Next Scheduled Pull: <b className="text-slate-700 dark:text-slate-300">{telemetry.nextIntervalTime}</b>
            </div>
          </div>
        </div>

        <p className="text-sm page-subheading leading-relaxed max-w-4xl">
          Equity meter or market meter represents overall Indian equity market situation. With the help of this page you can easily check market valuation, FPI/ DII activities &amp; many more using easy to understand chart and graphics. It can certainly help you during your investment journey.
        </p>

        {/* 3-Interval Live Pull Schedule Notice Ribbon */}
        <div className="mt-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5 flex-wrap text-xs text-slate-700 dark:text-slate-300">
            <span className="font-bold flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Daily Live Pull Schedule (3 Intervals):
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-all ${
                  telemetry.currentInterval === 'OPEN'
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-950 dark:text-amber-200 border-amber-400 font-black shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                ① Market Open · 09:15 AM IST
              </span>
              <span className="text-slate-400">→</span>
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-all ${
                  telemetry.currentInterval === 'MIDDAY'
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-950 dark:text-amber-200 border-amber-400 font-black shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                ② Mid-Day of Market · 12:30 PM IST
              </span>
              <span className="text-slate-400">→</span>
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-all ${
                  telemetry.currentInterval === 'CLOSE'
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-950 dark:text-emerald-200 border-emerald-400 font-black shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                ③ End of Market · 03:30 PM IST
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs active:scale-98 disabled:opacity-50"
            title="Trigger an immediate live telemetry snapshot pull"
          >
            <svg
              className={`w-3.5 h-3.5 text-amber-600 dark:text-amber-400 ${isSyncing ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isSyncing ? 'Pulling Live Data…' : 'Pull Live Snapshot'}
          </button>
        </div>

        {/* Institutional FPI / DII Activity Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
          {INSTITUTIONAL_FLOWS.map((flow) => (
            <div key={flow.label} className="p-4 rounded-2xl calc-card border">
              <span className="text-[11px] font-bold uppercase tracking-wider page-subheading block mb-1">
                {flow.label}
              </span>
              <div className="flex items-center justify-between text-xs mt-2">
                <span className="page-subheading font-medium">FPI/FII Net:</span>
                <b className={`font-mono font-bold ${flow.fpiNet >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {flow.fpiNet >= 0 ? '+' : ''}₹{Math.abs(flow.fpiNet).toLocaleString('en-IN')} Cr
                </b>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="page-subheading font-medium">DII Net:</span>
                <b className={`font-mono font-bold ${flow.diiNet >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {flow.diiNet >= 0 ? '+' : ''}₹{Math.abs(flow.diiNet).toLocaleString('en-IN')} Cr
                </b>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 1: NSE Major Indices P/E Meter */}
      <section className="mb-12">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-3 mb-6 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="font-serif text-2xl font-bold page-heading flex items-center gap-2.5">
              <span className="w-2 h-6 bg-rose-700 rounded-full inline-block"></span>
              NSE Major Indices P/E Meter
            </h2>
            <p className="text-xs page-subheading mt-0.5">
              Benchmark market capitalization valuation bands (Nifty 50, Next 50, Midcap, Smallcap)
            </p>
          </div>
          <span className="text-[11px] font-mono page-subheading">
            Click any meter to inspect history
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {MAJOR_INDICES_PE.map((item) => (
            <PeMeterGauge
              key={item.id}
              value={item.pe}
              label={item.name}
              maxVal={item.maxVal}
              ticks={item.ticks}
              avgVal={item.medAvg}
              status={item.status}
              isSelected={selectedSectorId === item.id}
              onClick={() => setSelectedSectorId(item.id)}
            />
          ))}
        </div>
      </section>

      {/* SECTION 2: NSE Major Sectoral Indices P/E Meter */}
      <section className="mb-12">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-3 mb-6 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="font-serif text-2xl font-bold text-slate-950 dark:text-slate-100 flex items-center gap-2.5">
              <span className="w-2 h-6 bg-rose-700 rounded-full inline-block"></span>
              NSE Major Sectoral Indices P/E Meter
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Sector-specific earnings multiples across IT, Auto, Infra, Defence, Banking, Pharma &amp; FMCG
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SECTORAL_INDICES_PE.map((item) => (
            <PeMeterGauge
              key={item.id}
              value={item.pe}
              label={item.name}
              maxVal={item.maxVal}
              ticks={item.ticks}
              avgVal={item.medAvg}
              status={item.status}
              isSelected={selectedSectorId === item.id}
              onClick={() => setSelectedSectorId(item.id)}
            />
          ))}
        </div>
      </section>

      {/* SECTION 3: Detailed Sector Valuation Dossier (FinLive Deep-Dive Inspector) */}
      <section className="mb-14 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-6 flex-wrap gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              VALUATION DEEP-DIVE INSPECTOR
            </span>
            <h2 className="font-serif text-3xl font-bold text-slate-950 dark:text-slate-100 mt-1">
              {selectedSector.name} : {selectedSector.pe.toFixed(2)}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Last Updated 18/11/2026, 10:24 PM · Multi-Horizon Moving Averages &amp; Trend Signals
            </p>
          </div>

          {/* Sector & Benchmark Quick Switcher Chips */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mr-0.5">
                Benchmarks:
              </span>
              {MAJOR_INDICES_PE.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedSectorId(s.id)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border transition-all cursor-pointer ${
                    selectedSectorId === s.id
                      ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-xs ring-2 ring-amber-400/30'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {s.symbol}
                </button>
              ))}
            </div>

            <div className="hidden sm:block h-4 w-px bg-slate-300 dark:bg-slate-700"></div>

            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mr-0.5">
                Sectors:
              </span>
              {SECTORAL_INDICES_PE.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedSectorId(s.id)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border transition-all cursor-pointer ${
                    selectedSectorId === s.id
                      ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-xs ring-2 ring-amber-400/30'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {s.symbol}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 3 Semicircular Average Gauges (Matching Image 3) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <PeMeterGauge
            value={selectedSector.pe}
            label={selectedSector.name}
            maxVal={selectedSector.maxVal}
            ticks={selectedSector.ticks}
            status={selectedSector.status}
          />
          <PeMeterGauge
            value={selectedSector.medAvg}
            label={`${selectedSector.symbol} (Medium-Term Average)`}
            maxVal={selectedSector.maxVal}
            ticks={selectedSector.ticks}
            status="Fair Value"
          />
          <PeMeterGauge
            value={selectedSector.longAvg}
            label={`${selectedSector.symbol} (Long-Term Average)`}
            maxVal={selectedSector.maxVal}
            ticks={selectedSector.ticks}
            status="Fair Value"
          />
        </div>

        {/* Trend Signals (Matching Image 6) */}
        <div className="mb-8 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-3">
            {selectedSector.symbol} — PE Valuation Signals
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-rose-900 text-white text-center shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-200 block mb-1">
                Short-Term
              </span>
              <span className="text-lg font-black">{selectedSector.shortTermSignal}</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-800 text-white text-center shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 block mb-1">
                Medium-Term
              </span>
              <span className="text-lg font-black">{selectedSector.medTermSignal}</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-900 text-white text-center shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 block mb-1">
                Long-Term
              </span>
              <span className="text-lg font-black">{selectedSector.longTermSignal}</span>
            </div>
          </div>
        </div>

        {/* Trend Chart Timeframe Switcher Tabs (Matching Images 4 & 5) */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 w-fit">
            <button
              onClick={() => setTrendPeriod('15d')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                trendPeriod === '15d'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-950'
              }`}
            >
              Last 15 Days Daily
            </button>
            <button
              onClick={() => setTrendPeriod('24m')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                trendPeriod === '24m'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-950'
              }`}
            >
              Last 24 Months
            </button>
            <button
              onClick={() => setTrendPeriod('hist')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                trendPeriod === 'hist'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-950'
              }`}
            >
              Historical (2000–2026)
            </button>
          </div>

          <PeTrendChart data={currentTrendData} title={currentTrendTitle} />
        </div>

        {/* P/E HeatMap (Dynamic per Nifty Index) */}
        <PeHeatMap
          data={valuationBundle.heatmap}
          medAvg={selectedSector.medAvg}
          thresholds={valuationBundle.thresholds}
          title={`${selectedSector.name} - P/E Valuation HeatMap (2000–2026)`}
        />
      </section>

      {/* SECTION 4: Macro Intelligence Desk (Existing Scoreboard & Horizons) */}
      <section className="mb-12">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-3 mb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            STATISTICAL MODEL PERFORMANCE
          </span>
          <h2 className="text-2xl font-black text-slate-950 dark:text-slate-100 mt-1">
            Engine Accuracy &amp; Attributed Anomaly Ranking
          </h2>
        </div>

        {/* Model Accuracy Scoreboard */}
        <Scoreboard scoreboard={scoreboard} />

        {/* Market Meter & Horizon Directional Breadth */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8 items-stretch">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-2 font-mono">
              — Market Sentiment Dial
            </div>
            {loadingPulse ? (
              <div className="h-44 flex items-center justify-center text-xs italic text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
                Reviewing the case file…
              </div>
            ) : pulse ? (
              <MarketGauge score={pulse.dialScore} label={pulse.dialLabel} />
            ) : null}
          </div>

          {/* Horizons Directional Strip & Counts */}
          <div className="flex flex-col justify-between p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-3 font-mono">
                — Horizon Return Breadth
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Short-Term Horizon', data: pulse?.shortTerm },
                  { label: 'Medium-Term Horizon', data: pulse?.mediumTerm },
                  { label: 'Long-Term Horizon', data: pulse?.longTerm },
                ].map((h, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 text-xs">
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">{h.label} ({h.data?.days}d)</span>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`font-bold tabular-nums ${
                          h.data?.sign === 'bullish' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
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
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
              <div>Bullish: <b className="text-emerald-600 dark:text-emerald-400 tabular-nums">{pulse?.bullishCount ?? 0}</b></div>
              <div>Bearish: <b className="text-rose-600 dark:text-rose-400 tabular-nums">{pulse?.bearishCount ?? 0}</b></div>
              <div>Neutral: <b className="text-slate-900 dark:text-slate-100 tabular-nums">{pulse?.neutralCount ?? 0}</b></div>
            </div>
          </div>
        </div>

        {/* Sector Sentiment Snapshots */}
        <div className="my-10">
          <div className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-3 font-mono">
            — Sector Momentum Snapshots
          </div>
          {loadingSectors ? (
            <div className="py-6 text-center text-xs italic text-slate-500">Reviewing the case file…</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {sectors?.map((s: SectorSnapshot) => {
                const isGain = s.changePct >= 0;
                return (
                  <div
                    key={s.sector}
                    className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-400 dark:hover:border-amber-500 rounded-2xl transition-all cursor-pointer shadow-xs"
                    onClick={() => {
                      if (s.topSymbols && s.topSymbols.length > 0) {
                        navigate(`/?symbol=${s.topSymbols[0]}`);
                      }
                    }}
                  >
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1">{s.sector}</div>
                    <div className="flex items-baseline justify-between mt-2">
                      <span className={`text-xs font-bold ${isGain ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {isGain ? '▲' : '▼'} {s.changePct > 0 ? '+' : ''}{s.changePct}%
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {s.sentiment}
                      </span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex gap-1.5 flex-wrap">
                      {s.topSymbols?.map((sym) => (
                        <span key={sym} className="font-mono text-slate-700 dark:text-slate-300 hover:text-amber-600 font-semibold">
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

        {/* Anomaly Leaderboard */}
        <div className="my-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
          <div className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-4 font-mono">
            — Most Unusual Moves (Ranked by <GlossaryTerm termKey="z-score">|z-score|</GlossaryTerm>)
          </div>
          {loadingLeaderboard ? (
            <div className="py-6 text-center text-xs italic text-slate-500">Reviewing the case file…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="text-left font-bold text-slate-700 dark:text-slate-300 py-2.5 pr-4">Symbol</th>
                    <th className="text-left font-bold text-slate-700 dark:text-slate-300 py-2.5 pr-4">Event Date</th>
                    <th className="text-right font-bold text-slate-700 dark:text-slate-300 py-2.5 pr-4">Return %</th>
                    <th className="text-right font-bold text-slate-700 dark:text-slate-300 py-2.5 pr-4">|z-score|</th>
                    <th className="text-left font-bold text-slate-700 dark:text-slate-300 py-2.5 pr-4">Attributed Cause</th>
                    <th className="text-left font-bold text-slate-700 dark:text-slate-300 py-2.5">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard?.map((item: Anomaly, idx: number) => {
                    const isGain = item.returnPct >= 0;
                    return (
                      <tr
                        key={idx}
                        className="border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/?symbol=${item.symbol}`)}
                      >
                        <td className="py-3 pr-4 font-mono font-bold text-slate-900 dark:text-slate-100">{item.symbol}</td>
                        <td className="py-3 pr-4 text-slate-600 dark:text-slate-400 tabular-nums">{item.date}</td>
                        <td className={`py-3 pr-4 text-right font-bold tabular-nums ${isGain ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {isGain ? '+' : ''}{item.returnPct}%
                        </td>
                        <td className="py-3 pr-4 text-right font-mono tabular-nums text-amber-700 dark:text-amber-400 font-black">
                          {Math.abs(item.returnZ).toFixed(2)}
                        </td>
                        <td className="py-3 pr-4 text-slate-800 dark:text-slate-200 font-medium">{item.label}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 text-[10px] rounded-full uppercase font-mono font-bold ${
                            item.confidence === 'unconfirmed'
                              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
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
      </section>

      {/* Footer Disclaimer */}
      <footer className="pt-6 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 leading-relaxed text-center">
        MarketMind is an institutional causal explanation &amp; valuation research tool built on verified market series and news corpora. It does not predict future prices and is not investment advice.
      </footer>
    </div>
  );
};
