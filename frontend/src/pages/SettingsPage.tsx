import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPreferencesApi, updatePreferencesApi } from '../api/user';
import { useToast } from '../components/Toast';
import { ChartType, Interval } from '../features/chart/chartUtils';

export const CHART_PREFS_KEY = 'mm_chart_prefs';
export const loadChartPrefs = (): { type: ChartType; interval: Interval } => {
  try { return { type: 'candle', interval: 'D', ...JSON.parse(localStorage.getItem(CHART_PREFS_KEY) || '{}') }; }
  catch { return { type: 'candle', interval: 'D' }; }
};

export type ThemePref = 'dark' | 'light' | 'auto';
export const applyTheme = (t: ThemePref) => { document.documentElement.dataset.theme = t; localStorage.setItem('mm_theme', t); };

const LOOKBACKS = [22, 66, 132, 260];

export const SettingsPage: React.FC = () => {
  const { showToast } = useToast();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['prefs'], queryFn: getPreferencesApi });
  const [chart, setChart] = useState(loadChartPrefs());
  const [themePref, setThemePref] = useState<ThemePref>((localStorage.getItem('mm_theme') as ThemePref) || 'dark');
  const lookback = data?.defaultLookbackDays ?? 66;
  const reduced = data?.reducedMotion ?? false;

  const savePrefs = async (patch: Partial<{ defaultLookbackDays: number; reducedMotion: boolean }>) => {
    try {
      await updatePreferencesApi({ defaultLookbackDays: lookback, reducedMotion: reduced, ...patch });
      qc.invalidateQueries({ queryKey: ['prefs'] });
      showToast('Preferences saved', 'success');
    } catch { showToast('Could not save preferences', 'error'); }
  };
  const saveChart = (patch: Partial<typeof chart>) => {
    const next = { ...chart, ...patch };
    setChart(next);
    localStorage.setItem(CHART_PREFS_KEY, JSON.stringify(next));
    showToast('Chart defaults saved', 'success');
  };
  const field = 'bg-transparent border-b-2 border-ink py-1.5 text-sm text-ink';

  return (
    <div className="pt-6">
      <h1 className="font-serif text-3xl mb-1">Settings</h1>
      <p className="text-ink-soft mb-8 text-sm">Defaults for the research desk and charts.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-xl">
        <label className="text-xs uppercase tracking-wider text-ink-soft">Default lookback
          <select className={`${field} w-full mt-1`} value={lookback} onChange={(e) => savePrefs({ defaultLookbackDays: +e.target.value })}>
            {LOOKBACKS.map((d) => <option key={d} value={d}>{d} trading days</option>)}
          </select>
        </label>
        <label className="text-xs uppercase tracking-wider text-ink-soft">Reduced motion
          <select className={`${field} w-full mt-1`} value={String(reduced)} onChange={(e) => savePrefs({ reducedMotion: e.target.value === 'true' })}>
            <option value="false">Off</option><option value="true">On</option>
          </select>
        </label>
        <label className="text-xs uppercase tracking-wider text-ink-soft">Theme
          <select className={`${field} w-full mt-1`} value={themePref} onChange={(e) => { const t = e.target.value as ThemePref; setThemePref(t); applyTheme(t); }}>
            <option value="dark">Night ledger (green)</option><option value="light">Paper (light)</option><option value="auto">Match system</option>
          </select>
        </label>
        <label className="text-xs uppercase tracking-wider text-ink-soft">Default chart
          <select className={`${field} w-full mt-1`} value={chart.type} onChange={(e) => saveChart({ type: e.target.value as ChartType })}>
            <option value="candle">Candlesticks</option><option value="line">Line</option><option value="area">Area</option>
          </select>
        </label>
        <label className="text-xs uppercase tracking-wider text-ink-soft">Default interval
          <select className={`${field} w-full mt-1`} value={chart.interval} onChange={(e) => saveChart({ interval: e.target.value as Interval })}>
            <option value="D">Daily</option><option value="W">Weekly</option><option value="M">Monthly</option>
          </select>
        </label>
      </div>
    </div>
  );
};
