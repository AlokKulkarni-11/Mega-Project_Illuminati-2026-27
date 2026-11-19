import React from 'react';
import { GlossaryTerm } from './GlossaryTerm';
import { ChartType, Interval, RANGES, RangeKey } from '../features/chart/chartUtils';

const Seg = <T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) => (
  <div className="flex items-center gap-2">
    <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">{label}</span>
    <div className="inline-flex border border-rule rounded-md overflow-hidden bg-paper shadow-sm" role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          aria-pressed={v === value}
          onClick={() => onChange(v)}
          className={`px-2.5 py-1 text-xs border-r border-rule last:border-r-0 transition-colors font-medium ${
            v === value ? 'bg-brass text-white font-semibold' : 'text-ink-soft hover:text-ink hover:bg-paper-inset'
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  </div>
);

interface Props {
  range: RangeKey;
  interval: Interval;
  type: ChartType;
  sma: boolean;
  volume: boolean;
  onChange: (patch: Partial<{ range: RangeKey; interval: Interval; type: ChartType; sma: boolean; volume: boolean }>) => void;
}

export const ChartControls: React.FC<Props> = ({ range, interval, type, sma, volume, onChange }) => (
  <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5 my-3.5 non-printable text-xs">
    <Seg label="Range" value={range} options={RANGES.map((r) => [r, r])} onChange={(v) => onChange({ range: v })} />
    <Seg
      label="Interval"
      value={interval}
      options={[
        ['D', '1D'],
        ['W', '1W'],
        ['M', '1M'],
      ]}
      onChange={(v) => onChange({ interval: v })}
    />
    <Seg
      label="Chart"
      value={type}
      options={[
        ['candle', 'Candles'],
        ['line', 'Line'],
        ['area', 'Mountain'],
      ]}
      onChange={(v) => onChange({ type: v })}
    />
    <div className="flex items-center gap-4">
      <label className="text-xs text-ink-soft flex items-center gap-1.5 cursor-pointer font-medium hover:text-ink">
        <input
          type="checkbox"
          checked={sma}
          onChange={(e) => onChange({ sma: e.target.checked })}
          className="rounded border-rule text-brass focus:ring-brass"
        />
        <span>
          <GlossaryTerm termKey="moving average">SMA (20)</GlossaryTerm>
        </span>
      </label>
      <label className="text-xs text-ink-soft flex items-center gap-1.5 cursor-pointer font-medium hover:text-ink">
        <input
          type="checkbox"
          checked={volume}
          onChange={(e) => onChange({ volume: e.target.checked })}
          className="rounded border-rule text-brass focus:ring-brass"
        />
        <span>
          <GlossaryTerm termKey="volume">Volume</GlossaryTerm>
        </span>
      </label>
    </div>
  </div>
);
