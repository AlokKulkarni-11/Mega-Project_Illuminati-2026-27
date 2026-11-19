import React, { useMemo } from 'react';
import { HeatmapRow } from '../features/valuation/valuationData';

export interface HeatmapThresholds {
  deepValue: number;
  undervalued: number;
  fairLow: number;
  fairHigh: number;
  premium: number;
}

interface PeHeatMapProps {
  data: HeatmapRow[];
  title?: string;
  medAvg?: number;
  thresholds?: HeatmapThresholds;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export const PeHeatMap: React.FC<PeHeatMapProps> = ({
  data,
  title = 'NIFTY P/E HeatMap',
  medAvg,
  thresholds: customThresholds,
}) => {
  const effThresholds = useMemo<HeatmapThresholds>(() => {
    if (customThresholds) return customThresholds;
    if (medAvg && medAvg > 0) {
      return {
        deepValue: Math.round(medAvg * 0.72 * 10) / 10,
        undervalued: Math.round(medAvg * 0.88 * 10) / 10,
        fairLow: Math.round(medAvg * 1.08 * 10) / 10,
        fairHigh: Math.round(medAvg * 1.22 * 10) / 10,
        premium: Math.round(medAvg * 1.40 * 10) / 10,
      };
    }
    return {
      deepValue: 15,
      undervalued: 20,
      fairLow: 24,
      fairHigh: 28,
      premium: 35,
    };
  }, [customThresholds, medAvg]);

  const getCellColor = (val: number | null) => {
    if (val === null || val === undefined) return 'bg-slate-50/50 dark:bg-slate-800/30 text-slate-300 dark:text-slate-600';
    if (val < effThresholds.deepValue) return 'bg-[#3B82F6] text-white font-bold'; // Deep Value Blue (e.g. 2008 crashes)
    if (val < effThresholds.undervalued) return 'bg-[#10B981] text-slate-950 font-bold'; // Undervalued Green
    if (val < effThresholds.fairLow) return 'bg-[#A3E635] text-slate-950 font-medium'; // Fair Lime
    if (val < effThresholds.fairHigh) return 'bg-[#FDE047] text-slate-950 font-medium'; // Fair Yellow
    if (val < effThresholds.premium) return 'bg-[#F59E0B] text-slate-950 font-bold'; // Premium Amber/Orange
    return 'bg-[#EF4444] text-white font-black'; // Overvalued Red
  };

  return (
    <div className="w-full calc-card border rounded-3xl p-5 shadow-xs">
      {/* Title & Valuation Legend */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4 flex-wrap gap-3">
        <h3 className="font-serif text-lg font-bold page-heading flex items-center gap-2">
          <span className="w-1.5 h-4 bg-rose-700 rounded-full inline-block"></span>
          {title}
        </h3>

        {/* Color Legend Bar */}
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-[#3B82F6] inline-block"></span>
            <span className="text-slate-600 dark:text-slate-400">&lt;{effThresholds.deepValue} Deep Value</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-[#10B981] inline-block"></span>
            <span className="text-slate-600 dark:text-slate-400">{effThresholds.deepValue}–{effThresholds.undervalued} Undervalued</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-[#FDE047] inline-block"></span>
            <span className="text-slate-600 dark:text-slate-400">{effThresholds.undervalued}–{effThresholds.fairHigh} Fair</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-[#F59E0B] inline-block"></span>
            <span className="text-slate-600 dark:text-slate-400">{effThresholds.fairHigh}–{effThresholds.premium} Premium</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-[#EF4444] inline-block"></span>
            <span className="text-slate-600 dark:text-slate-400">&gt;{effThresholds.premium} Expensive</span>
          </span>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs select-none">
          <thead>
            <tr>
              <th className="p-2 border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-center">
                YEAR
              </th>
              {MONTHS.map((m) => (
                <th
                  key={m}
                  className="p-2 border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-center"
                >
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.year} className="hover:opacity-95 transition-opacity">
                <td className="p-2 border border-dashed border-slate-300 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-50/80 dark:bg-slate-800/80 text-center">
                  {row.year}
                </td>
                {row.months.map((val, idx) => (
                  <td
                    key={idx}
                    className={`p-2 border border-dashed border-slate-300/80 dark:border-slate-700 text-center font-mono tabular-nums text-[11px] transition-transform hover:scale-105 hover:z-10 relative ${getCellColor(
                      val
                    )}`}
                    title={val !== null ? `${MONTHS[idx]} ${row.year}: P/E ${val.toFixed(2)}` : undefined}
                  >
                    {val !== null ? val.toFixed(val >= 100 ? 1 : 2) : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
