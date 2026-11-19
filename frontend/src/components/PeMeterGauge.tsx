import React from 'react';

export interface PeMeterGaugeProps {
  value: number;
  label: string;
  maxVal: number;
  ticks: number[];
  avgVal?: number;
  status?: 'Undervalued' | 'Fair Value' | 'Stretched' | 'Overheated';
  onClick?: () => void;
  isSelected?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const PeMeterGauge: React.FC<PeMeterGaugeProps> = ({
  value,
  label,
  maxVal,
  ticks,
  avgVal,
  status,
  onClick,
  isSelected = false,
  size = 'md',
}) => {
  // Center is (150, 140), radius is 100
  const cx = 150;
  const cy = 135;
  const r = 95;

  const f = Math.min(1, Math.max(0, value / maxVal));
  const needleAngle = Math.PI * (1 - f);
  const needleTipX = cx + (r - 10) * Math.cos(needleAngle);
  const needleTipY = cy - (r - 10) * Math.sin(needleAngle);

  // Status computation if not provided
  const computedStatus =
    status ||
    (f < 0.35
      ? 'Undervalued'
      : f < 0.65
      ? 'Fair Value'
      : f < 0.82
      ? 'Stretched'
      : 'Overheated');

  const statusColor =
    computedStatus === 'Undervalued'
      ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800'
      : computedStatus === 'Fair Value'
      ? 'text-lime-700 dark:text-lime-400 bg-lime-50 dark:bg-lime-950/60 border-lime-200 dark:border-lime-800'
      : computedStatus === 'Stretched'
      ? 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800'
      : 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800';

  const gradId = `peGrad_${label.replace(/[^a-zA-Z0-9]/g, '_')}`;

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-3xl calc-card border transition-all select-none flex flex-col items-center justify-between ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-amber-400 dark:hover:border-amber-500' : ''
      } ${
        isSelected
          ? 'border-amber-500 dark:border-amber-500 ring-2 ring-amber-400/20 shadow-sm'
          : 'border-slate-200 dark:border-slate-800 shadow-xs'
      }`}
    >
      <div className="w-full relative flex items-center justify-center">
        <svg
          viewBox="0 0 300 170"
          className="w-full max-w-[260px] overflow-visible"
          role="img"
          aria-label={`${label} P/E Gauge: ${value}`}
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="25%" stopColor="#10B981" />
              <stop offset="50%" stopColor="#EAB308" />
              <stop offset="75%" stopColor="#F97316" />
              <stop offset="100%" stopColor="#EF4444" />
            </linearGradient>
          </defs>

          {/* Background Arc Shadow */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke="currentColor"
            className="text-slate-100 dark:text-slate-800"
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* Gauge Color Gradient Arc */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth="6"
            strokeLinecap="round"
          />

          {/* Tick Marks & Numbers */}
          {ticks.map((t) => {
            const tf = Math.min(1, Math.max(0, t / maxVal));
            const angle = Math.PI * (1 - tf);
            const xInner = cx + (r - 7) * Math.cos(angle);
            const yInner = cy - (r - 7) * Math.sin(angle);
            const xOuter = cx + (r + 7) * Math.cos(angle);
            const yOuter = cy - (r + 7) * Math.sin(angle);
            const xText = cx + (r + 20) * Math.cos(angle);
            const yText = cy - (r + 20) * Math.sin(angle);

            return (
              <g key={t}>
                <line
                  x1={xInner}
                  y1={yInner}
                  x2={xOuter}
                  y2={yOuter}
                  stroke="#94A3B8"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <text
                  x={xText}
                  y={yText}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="10"
                  fontWeight="600"
                  fill="#64748B"
                  className="font-mono"
                >
                  {t}
                </text>
              </g>
            );
          })}

          {/* Historical Average Marker (if provided) */}
          {avgVal !== undefined && (
            (() => {
              const af = Math.min(1, Math.max(0, avgVal / maxVal));
              const aAngle = Math.PI * (1 - af);
              const ax = cx + (r + 3) * Math.cos(aAngle);
              const ay = cy - (r + 3) * Math.sin(aAngle);
              return (
                <circle
                  cx={ax}
                  cy={ay}
                  r="3.5"
                  fill="#2563EB"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
              );
            })()
          )}

          {/* Needle Line with Burgundy/Crimson Styling */}
          <line
            x1={cx}
            y1={cy}
            x2={needleTipX}
            y2={needleTipY}
            stroke="#991B1B"
            strokeWidth="3.2"
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />

          {/* Needle Pointer Tip Ring */}
          <circle
            cx={needleTipX}
            cy={needleTipY}
            r="5"
            fill="#FFFFFF"
            stroke="#991B1B"
            strokeWidth="2.8"
          />

          {/* Center Pivot Ring */}
          <circle
            cx={cx}
            cy={cy}
            r="6"
            fill="#FFFFFF"
            stroke="#991B1B"
            strokeWidth="2.8"
          />
        </svg>
      </div>

      {/* Numerical P/E Value & Label */}
      <div className="text-center mt-1">
        <div className="text-2xl sm:text-3xl font-black text-rose-950 dark:text-rose-200 tabular-nums tracking-tight">
          {value.toFixed(2)}
        </div>
        <div className="text-xs font-black uppercase tracking-wider text-rose-900 dark:text-rose-300 mt-0.5">
          {label}
        </div>
        <div className="mt-2">
          <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusColor}`}>
            {computedStatus}
          </span>
        </div>
      </div>
    </div>
  );
};
