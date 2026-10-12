import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceDot,
} from 'recharts';
import { PricePoint } from '../types';

interface SparklineProps {
  data: PricePoint[];
  anomalyDate?: string;
  isGain?: boolean;
}

export const Sparkline: React.FC<SparklineProps> = ({ data, anomalyDate, isGain = false }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-24 flex items-center justify-center text-xs text-ink-soft italic">
        Price data unavailable for sparkline window.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    date: d.date,
    close: Number(d.close),
  }));

  const anomalyPoint = chartData.find((d) => d.date === anomalyDate);
  const strokeColor = isGain ? '#1F4E3D' : '#8B2E1F';

  return (
    <div className="w-full h-24 my-3 chart-row border-y border-rule py-1">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
          <XAxis
            dataKey="date"
            hide
          />
          <YAxis
            domain={['auto', 'auto']}
            hide
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="bg-paper-inset border border-rule px-2 py-1 text-xs text-ink tabular-nums shadow-none">
                    <span className="font-medium">{item.date}: </span>
                    <span>₹{Number(item.close).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                );
              }
              return null;
            }}
          />
          <Line
            type="monotone"
            dataKey="close"
            stroke={strokeColor}
            strokeWidth={1.75}
            dot={false}
            isAnimationActive={true}
          />
          {anomalyPoint && (
            <ReferenceDot
              x={anomalyPoint.date}
              y={anomalyPoint.close}
              r={4}
              fill="#A8823C"
              stroke="#FAFAF7"
              strokeWidth={1.5}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
