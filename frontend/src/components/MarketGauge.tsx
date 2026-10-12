import React from 'react';

interface MarketGaugeProps {
  score: number; // 0 to 100
  label: string;
}

export const MarketGauge: React.FC<MarketGaugeProps> = ({ score, label }) => {
  const clampedScore = Math.max(0, Math.min(100, score));
  // Needle angle: 0 -> -90deg, 50 -> 0deg, 100 -> +90deg
  const needleAngle = -90 + (clampedScore / 100) * 180;

  return (
    <div
      role="img"
      aria-label={`Market sentiment dial indicating ${label} with a score of ${clampedScore} out of 100`}
      className="flex flex-col items-center justify-center p-4 bg-paper-inset border border-rule"
    >
      <div className="relative w-48 h-24 overflow-hidden">
        {/* Semi-circular dial arc */}
        <svg viewBox="0 0 200 100" className="w-full h-full">
          {/* Dial Arc Background */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#C6CBBC"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Bearish Zone (left) */}
          <path
            d="M 20 100 A 80 80 0 0 1 70 35"
            fill="none"
            stroke="#8B2E1F"
            strokeWidth="12"
            strokeOpacity="0.4"
          />
          {/* Bullish Zone (right) */}
          <path
            d="M 130 35 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#1F4E3D"
            strokeWidth="12"
            strokeOpacity="0.4"
          />
          {/* Center Pivot */}
          <circle cx="100" cy="100" r="7" fill="#1B2B22" />
        </svg>

        {/* Brass Needle */}
        <div
          className="absolute bottom-0 left-1/2 -ml-[2px] w-1 h-20 bg-brass origin-bottom transition-transform duration-1000 ease-out"
          style={{
            transform: `rotate(${needleAngle}deg)`,
            transformOrigin: '50% 100%',
          }}
        >
          {/* Brass Needle Tip */}
          <div className="w-2.5 h-2.5 bg-brass -ml-[3px] -mt-1 rotate-45 transform" />
        </div>
      </div>

      <div className="mt-3 text-center">
        <div className="font-serif text-lg font-medium text-ink">{label}</div>
        <div className="text-xs text-ink-soft tabular-nums">Meter Reading: {clampedScore.toFixed(1)} / 100</div>
      </div>
    </div>
  );
};
