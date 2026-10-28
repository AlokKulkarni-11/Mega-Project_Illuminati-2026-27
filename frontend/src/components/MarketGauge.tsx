import React from 'react';

interface MarketGaugeProps {
  score: number; // 0 to 100
  label: string;
}

/** Semicircle dial: bearish (left, red) to bullish (right, green) with a brass needle. */
export const MarketGauge: React.FC<MarketGaugeProps> = ({ score, label }) => {
  const s = Math.max(0, Math.min(100, score));
  const deg = (s / 100) * 180; // 0 = pointing left, 180 = pointing right
  return (
    <div className="flex items-center gap-6 flex-wrap p-4 bg-paper-inset border border-rule">
      <svg viewBox="0 0 300 175" className="w-full max-w-[300px]" role="img"
        aria-label={`Market sentiment dial: ${label}, ${s.toFixed(0)} out of 100`}>
        <path d="M30,150A120,120 0 0 1 270,150" fill="none" stroke="rgb(var(--c-rule))" strokeWidth="10" />
        <path d="M30,150A120,120 0 0 1 150,30" fill="none" stroke="rgb(var(--c-loss))" strokeWidth="10" opacity=".7" />
        <path d="M150,30A120,120 0 0 1 270,150" fill="none" stroke="rgb(var(--c-gain))" strokeWidth="10" opacity=".7" />
        <line x1="150" y1="150" x2="55" y2="150" stroke="rgb(var(--c-brass))" strokeWidth="3" strokeLinecap="round"
          style={{ transformOrigin: '150px 150px', transform: `rotate(${deg}deg)`, transition: 'transform 1s ease-out' }} />
        <circle cx="150" cy="150" r="6" fill="rgb(var(--c-brass))" />
        <text x="20" y="168" fontSize="11" fill="rgb(var(--c-soft))">Bearish</text>
        <text x="250" y="168" fontSize="11" fill="rgb(var(--c-soft))">Bullish</text>
      </svg>
      <div>
        <div className="font-serif text-3xl font-bold tracking-tight">{label}</div>
        <div className="text-sm text-ink-soft tabular-nums">Dial {s.toFixed(0)}/100</div>
      </div>
    </div>
  );
};
