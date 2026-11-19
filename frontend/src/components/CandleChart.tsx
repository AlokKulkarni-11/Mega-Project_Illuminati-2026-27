import React, { useMemo, useState } from 'react';
import { Bar, ChartType, sma } from '../features/chart/chartUtils';

interface Props {
  bars: Bar[];
  type: ChartType;
  showSma: boolean;
  showVolume: boolean;
  anomalyDates?: string[];
  selectedDate?: string;
  onSelectAnomaly?: (date: string) => void;
  label: string;
  symbol?: string;
}

const W = 820, H = 360, PL = 6, PR = 72, PT = 10, PB = 22;
const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const CandleChart: React.FC<Props> = ({ bars, type, showSma, showVolume, anomalyDates = [], selectedDate, onSelectAnomaly, label, symbol }) => {
  const [hover, setHover] = useState<number | null>(null);

  const g = useMemo(() => {
    if (!bars.length) return null;
    const volH = showVolume ? 52 : 0;
    const ph = H - PT - PB - volH - (showVolume ? 8 : 0);
    let hi = Math.max(...bars.map((b) => b.high)), lo = Math.min(...bars.map((b) => b.low));
    const pad = (hi - lo || 1) * 0.04; hi += pad; lo -= pad;
    const step = (W - PL - PR) / bars.length;
    return {
      volH, ph, hi, lo, step,
      cw: Math.max(1, Math.min(14, step * 0.64)),
      y: (v: number) => PT + ((hi - v) / (hi - lo)) * ph,
      x: (i: number) => PL + step * (i + 0.5),
      maxVol: Math.max(...bars.map((b) => b.volume)) || 1,
      ma: showSma ? sma(bars, Math.min(20, Math.max(3, bars.length >> 2))) : [],
    };
  }, [bars, showVolume, showSma]);

  if (!g) return <div className="h-40 flex items-center justify-center text-xs italic text-ink-soft">Price data unavailable for this window.</div>;
  const { ph, hi, lo, step, cw, y, x, maxVol, ma, volH } = g;
  const cur = bars[hover ?? bars.length - 1];
  const firstBar = bars[0];
  const lastBar = bars[bars.length - 1];
  const netChange = lastBar ? lastBar.close - firstBar.open : 0;
  const netChangePct = firstBar?.open ? (netChange / firstBar.open) * 100 : 0;
  const tickEvery = Math.ceil(bars.length / 6);
  const line = bars.map((b, i) => `${i ? 'L' : 'M'}${x(i)},${y(b.close)}`).join('');

  return (
    <div className="chart-row tv-card p-4 my-4 shadow-sm">
      {/* Visual Ticker & Metric Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-rule/50 text-xs">
        <div className="flex items-center gap-2">
          {symbol && (
            <span className="font-mono font-black text-sm px-2 py-0.5 rounded-md bg-paper-inset border border-rule text-ink">
              {symbol}
            </span>
          )}
          <span className="font-serif font-bold text-base text-ink tabular-nums">
            ₹{fmt(lastBar.close)}
          </span>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold font-mono tabular-nums ${
            netChange >= 0 ? 'text-gain bg-gain/10' : 'text-loss bg-loss/10'
          }`}>
            {netChange >= 0 ? '▲ +' : '▼ '}{fmt(netChange)} ({netChangePct >= 0 ? '+' : ''}{netChangePct.toFixed(2)}%)
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-ink-soft font-mono">
          <span>Range: <b className="text-ink">₹{fmt(lo)}</b> &ndash; <b className="text-ink">₹{fmt(hi)}</b></span>
          <span className="hidden sm:inline">&middot; {bars.length} bars</span>
        </div>
      </div>

      <div className="text-xs text-ink-soft px-2 min-h-[22px] tabular-nums">
        <span className="font-medium text-ink">{cur.from === cur.to ? cur.date : `${cur.from} → ${cur.to}`}</span>
        {'  '}O ₹{fmt(cur.open)}  H ₹{fmt(cur.high)}  L ₹{fmt(cur.low)}  C{' '}
        <span className={cur.close >= cur.open ? 'text-gain' : 'text-loss'}>₹{fmt(cur.close)}</span>
        {'  '}Vol {(cur.volume / 1e6).toFixed(1)}M
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={label}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const i = Math.floor((((e.clientX - r.left) / r.width) * W - PL) / step);
          setHover(Math.max(0, Math.min(bars.length - 1, i)));
        }}
        onPointerLeave={() => setHover(null)}>
        {[0, 1, 2, 3, 4].map((i) => {
          const v = lo + ((hi - lo) * i) / 4;
          return (
            <g key={i}>
              <line x1={PL} x2={W - PR} y1={y(v)} y2={y(v)} stroke="rgb(var(--c-rule))" strokeDasharray="2 4" />
              <text x={W - PR + 6} y={y(v) + 4} fontSize="11" fill="rgb(var(--c-soft))">₹{v > 1e4 ? Math.round(v).toLocaleString('en-IN') : v.toFixed(1)}</text>
            </g>
          );
        })}
        {bars.map((b, i) => i % tickEvery === 0 && (
          <text key={`tick-${i}`} x={x(i)} y={H - 6} fontSize="11" textAnchor="middle" fill="rgb(var(--c-soft))">
            {new Date(`${b.date}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}
          </text>
        ))}
        {showVolume && bars.map((b, i) => {
          const h = (b.volume / maxVol) * volH;
          return <rect key={`v${i}`} x={x(i) - cw / 2} y={H - PB - h} width={cw} height={h} fill={b.close >= b.open ? 'rgb(var(--c-gain))' : 'rgb(var(--c-loss))'} opacity=".3" />;
        })}
        {type === 'candle' && bars.map((b, i) => {
          const c = b.close >= b.open ? 'rgb(var(--c-gain))' : 'rgb(var(--c-loss))';
          return (
            <g key={`candle-${i}-${b.date}`}>
              <line x1={x(i)} x2={x(i)} y1={y(b.high)} y2={y(b.low)} stroke={c} />
              <rect x={x(i) - cw / 2} y={y(Math.max(b.open, b.close))} width={cw} height={Math.max(1, Math.abs(y(b.open) - y(b.close)))}
                fill={b.close >= b.open ? 'rgb(var(--c-inset))' : c} stroke={c} />
            </g>
          );
        })}
        {type !== 'candle' && (
          <>
            {type === 'area' && <path d={`${line}L${x(bars.length - 1)},${PT + ph}L${x(0)},${PT + ph}Z`} fill="rgb(var(--c-ink))" opacity=".08" />}
            <path d={line} fill="none" stroke="rgb(var(--c-ink))" strokeWidth="1.6" />
          </>
        )}
        {showSma && (
          <path d={ma.map((v, i) => (v == null ? '' : `${i && ma[i - 1] != null ? 'L' : 'M'}${x(i)},${y(v)}`)).join('')}
            fill="none" stroke="rgb(var(--c-soft))" strokeWidth="1.2" strokeDasharray="5 3" />
        )}
        {anomalyDates.map((d) => {
          const i = bars.findIndex((b) => d >= b.from && d <= b.to);
          if (i < 0) return null;
          const ty = y(bars[i].high);
          return (
            <path key={d} d={`M${x(i) - 6},${ty - 14}L${x(i) + 6},${ty - 14}L${x(i)},${ty - 5}Z`}
              fill={d === selectedDate ? 'rgb(var(--c-ink))' : 'rgb(var(--c-brass))'} style={{ cursor: 'pointer' }} onClick={() => onSelectAnomaly?.(d)}>
              <title>{`Anomaly ${d}`}</title>
            </path>
          );
        })}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={PT} y2={PT + ph} stroke="rgb(var(--c-ink))" opacity=".35" />}
      </svg>
    </div>
  );
};
