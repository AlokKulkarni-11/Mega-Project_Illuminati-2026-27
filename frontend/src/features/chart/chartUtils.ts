import { PricePoint } from '../../types';

export type ChartType = 'candle' | 'line' | 'area';
export type Interval = 'D' | 'W' | 'M';
export type RangeKey = '1M' | '3M' | '6M' | '1Y';

export const RANGE_DAYS: Record<RangeKey, number> = { '1M': 22, '3M': 66, '6M': 132, '1Y': 260 };
export const RANGES = Object.keys(RANGE_DAYS) as RangeKey[];

export interface Bar extends PricePoint { from: string; to: string }

/** Group daily bars into weekly (Monday-start) or monthly bars. */
export function aggregate(points: PricePoint[], interval: Interval): Bar[] {
  if (interval === 'D') return points.map((p) => ({ ...p, from: p.date, to: p.date }));
  const buckets = new Map<string, Bar>();
  for (const raw of points) {
    const p = { ...raw, open: +raw.open, high: +raw.high, low: +raw.low, close: +raw.close, volume: +raw.volume };
    let key = p.date.slice(0, 7);
    if (interval === 'W') {
      const d = new Date(`${p.date}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
      key = d.toISOString().slice(0, 10);
    }
    const b = buckets.get(key);
    if (!b) buckets.set(key, { ...p, from: p.date, to: p.date });
    else {
      b.high = Math.max(b.high, p.high);
      b.low = Math.min(b.low, p.low);
      b.close = p.close;
      b.volume += p.volume;
      b.to = p.date;
      b.date = p.date;
    }
  }
  return [...buckets.values()];
}

export function sma(bars: Bar[], n: number): (number | null)[] {
  return bars.map((_, i) =>
    i < n - 1 ? null : bars.slice(i - n + 1, i + 1).reduce((s, b) => s + b.close, 0) / n,
  );
}
