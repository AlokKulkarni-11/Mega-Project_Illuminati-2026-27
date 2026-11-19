import React, { useState } from 'react';
import { TrendPoint } from '../features/valuation/valuationData';

interface PeTrendChartProps {
  data: TrendPoint[];
  title: string;
  yMin?: number;
  yMax?: number;
}

export const PeTrendChart: React.FC<PeTrendChartProps> = ({
  data,
  title,
  yMin: customMin,
  yMax: customMax,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) return null;

  const values = data.map((d) => d.pe);
  const minVal = customMin !== undefined ? customMin : Math.floor(Math.min(...values) * 0.98 * 10) / 10;
  const maxVal = customMax !== undefined ? customMax : Math.ceil(Math.max(...values) * 1.02 * 10) / 10;
  const range = maxVal - minVal || 1;

  const width = 800;
  const height = 300;
  const padLeft = 55;
  const padRight = 30;
  const padTop = 30;
  const padBottom = 45;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Grid steps (4 horizontal lines)
  const ySteps = 4;
  const yTicks = Array.from({ length: ySteps + 1 }, (_, i) => minVal + (range / ySteps) * i);

  // Generate SVG points
  const points = data.map((d, i) => {
    const x = padLeft + (i / (data.length - 1 || 1)) * chartW;
    const y = padTop + chartH - ((d.pe - minVal) / range) * chartH;
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, '');

  return (
    <div className="w-full calc-card border rounded-3xl p-5 shadow-xs">
      {/* Title & Legend Badge */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4 flex-wrap gap-2">
        <h3 className="font-serif text-lg font-bold page-heading flex items-center gap-2">
          <span className="w-1.5 h-4 bg-rose-700 rounded-full inline-block"></span>
          {title}
        </h3>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="w-3 h-3 rounded bg-rose-700 inline-block"></span>
          <span className="text-slate-600 dark:text-slate-400 font-semibold">P/E Ratio Trend</span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[600px] h-auto select-none overflow-visible">
          {/* Horizontal Grid lines & Y-axis labels */}
          {yTicks.map((tick, i) => {
            const y = padTop + chartH - ((tick - minVal) / range) * chartH;
            return (
              <g key={i}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-100 dark:text-slate-800"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 10}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="central"
                  fontSize="11"
                  fill="#64748B"
                  className="font-mono font-medium"
                >
                  {tick.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Vertical Grid lines */}
          {points.map((p, i) => (
            <line
              key={i}
              x1={p.x}
              y1={padTop}
              x2={p.x}
              y2={padTop + chartH}
              stroke="currentColor"
              className="text-slate-100 dark:text-slate-800"
              strokeWidth="1"
            />
          ))}

          {/* Trend Polyline */}
          <path
            d={pathD}
            fill="none"
            stroke="#991B1B"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points with Hover */}
          {points.map((p, i) => {
            const isHovered = hoveredIdx === i;
            return (
              <g key={i}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 6 : 4}
                  fill="#991B1B"
                  stroke="#FFFFFF"
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  className="cursor-pointer transition-all duration-150"
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />

                {/* X-axis tick label (every 1-2 points depending on length) */}
                {(data.length <= 15 || i % Math.ceil(data.length / 15) === 0 || i === data.length - 1) && (
                  <text
                    x={p.x}
                    y={padTop + chartH + 18}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#64748B"
                    className="font-mono font-medium"
                  >
                    {p.date.split(' ').slice(0, 2).join(' ')}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIdx !== null && points[hoveredIdx] && (
          <div
            className="absolute pointer-events-none bg-slate-950 text-white rounded-xl px-3 py-1.5 text-xs shadow-xl z-20 transition-all font-mono -translate-x-1/2 -translate-y-full"
            style={{
              left: `${(points[hoveredIdx].x / width) * 100}%`,
              top: `${(points[hoveredIdx].y / height) * 100}%`,
              marginTop: '-10px',
            }}
          >
            <div className="font-bold text-amber-300">{points[hoveredIdx].date}</div>
            <div className="text-white text-sm font-black">P/E: {points[hoveredIdx].pe.toFixed(2)}</div>
          </div>
        )}
      </div>
    </div>
  );
};
