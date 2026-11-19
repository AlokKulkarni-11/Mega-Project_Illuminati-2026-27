import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPreferencesApi, updatePreferencesApi } from '../api/user';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { ChartType, Interval } from '../features/chart/chartUtils';
import { applyAppTheme, getStoredTheme, AppTheme } from '../theme/themeManager';

export const CHART_PREFS_KEY = 'mm_chart_prefs';
export const loadChartPrefs = (): { type: ChartType; interval: Interval } => {
  try {
    return { type: 'candle', interval: 'D', ...JSON.parse(localStorage.getItem(CHART_PREFS_KEY) || '{}') };
  } catch {
    return { type: 'candle', interval: 'D' };
  }
};

export type ThemePref = 'dark' | 'light' | 'auto';
export const applyTheme = (t: ThemePref) => {
  const resolved = t === 'auto'
    ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : t;
  applyAppTheme(resolved);
};

const LOOKBACKS = [22, 66, 132, 260];

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['prefs'], queryFn: getPreferencesApi });
  const [chart, setChart] = useState(loadChartPrefs());
  const [themePref, setThemePref] = useState<ThemePref>(() => {
    const stored = getStoredTheme();
    return (stored as ThemePref) || 'light';
  });
  const lookback = data?.defaultLookbackDays ?? 66;
  const reduced = data?.reducedMotion ?? false;

  const savePrefs = async (patch: Partial<{ defaultLookbackDays: number; reducedMotion: boolean }>) => {
    try {
      await updatePreferencesApi({ defaultLookbackDays: lookback, reducedMotion: reduced, ...patch });
      qc.invalidateQueries({ queryKey: ['prefs'] });
      showToast('Preferences updated', 'success');
    } catch {
      showToast('Could not save preferences', 'error');
    }
  };

  const saveChart = (patch: Partial<typeof chart>) => {
    const next = { ...chart, ...patch };
    setChart(next);
    localStorage.setItem(CHART_PREFS_KEY, JSON.stringify(next));
    showToast('Chart defaults saved', 'success');
  };

  const field = 'bg-paper border border-rule rounded-md px-3 py-2 text-sm text-ink outline-none focus:border-brass focus:ring-1 focus:ring-brass transition-all';

  return (
    <div className="pt-6 pb-16">
      <div className="mb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-brass">PREFERENCES</span>
        <h1 className="text-2xl font-bold tracking-tight text-ink mt-1">Terminal Settings</h1>
        <p className="text-ink-soft text-sm mt-0.5">Configure appearance, chart defaults, and market analysis lookbacks.</p>
      </div>

      {/* User Profile & Security Navigation Card */}
      <div className="tv-card p-6 max-w-3xl mb-8 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black text-lg flex items-center justify-center border border-amber-300/30">
            {(user?.fullName || user?.email || 'A').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-ink">{user?.fullName || 'Research Analyst'}</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
            <p className="text-xs text-ink-soft font-mono mt-0.5">{user?.email}</p>
          </div>
        </div>
        <Link
          to="/profile"
          className="bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 active:scale-98"
        >
          Manage Profile & Password →
        </Link>
      </div>

      <div className="tv-card p-6 max-w-3xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <label className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
            Default Observation Window
            <select
              className={`${field} w-full mt-1.5`}
              value={lookback}
              onChange={(e) => savePrefs({ defaultLookbackDays: +e.target.value })}
            >
              {LOOKBACKS.map((d) => (
                <option key={d} value={d}>
                  {d} trading days ({Math.round(d / 22)} months)
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
            Color Scheme Theme
            <select
              className={`${field} w-full mt-1.5`}
              value={themePref}
              onChange={(e) => {
                const t = e.target.value as ThemePref;
                setThemePref(t);
                applyTheme(t);
              }}
            >
              <option value="light">TradingView Light (White)</option>
              <option value="dark">TradingView Dark (Slate)</option>
              <option value="auto">System Match</option>
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
            Reduced Motion
            <select
              className={`${field} w-full mt-1.5`}
              value={String(reduced)}
              onChange={(e) => savePrefs({ reducedMotion: e.target.value === 'true' })}
            >
              <option value="false">Off (Fluid animations)</option>
              <option value="true">On (Accessibility mode)</option>
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
            Default Chart View
            <select
              className={`${field} w-full mt-1.5`}
              value={chart.type}
              onChange={(e) => saveChart({ type: e.target.value as ChartType })}
            >
              <option value="candle">Candlesticks (OHLC)</option>
              <option value="line">Line Chart</option>
              <option value="area">Area Mountain</option>
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
            Default Candlestick Interval
            <select
              className={`${field} w-full mt-1.5`}
              value={chart.interval}
              onChange={(e) => saveChart({ interval: e.target.value as Interval })}
            >
              <option value="D">Daily (1D)</option>
              <option value="W">Weekly (1W)</option>
              <option value="M">Monthly (1M)</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  );
};
