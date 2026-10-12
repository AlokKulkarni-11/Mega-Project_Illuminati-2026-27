import React from 'react';
import { Scoreboard as ScoreboardType } from '../types';

interface ScoreboardProps {
  scoreboard?: ScoreboardType;
}

export const Scoreboard: React.FC<ScoreboardProps> = ({ scoreboard }) => {
  if (!scoreboard) return null;

  return (
    <div className="border border-rule bg-paper-inset p-4 my-6">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-xs uppercase tracking-wider text-ink-soft font-mono">— Historical Model Accuracy</span>
        <span className="text-xs text-brass font-medium">Nifty Bank Backtest</span>
      </div>
      <p className="font-serif text-base text-ink italic">
        "{scoreboard.summary}"
      </p>
      <div className="mt-3 flex items-center space-x-6 text-xs text-ink-soft">
        <div>Total Moves Analyzed: <span className="font-semibold text-ink tabular-nums">{scoreboard.totalAnalyzed}</span></div>
        <div>Sourced Driver: <span className="font-semibold text-gain tabular-nums">{scoreboard.explainedCount}</span></div>
        <div>Abstentions: <span className="font-semibold text-loss tabular-nums">{scoreboard.unexplainedCount}</span></div>
      </div>
    </div>
  );
};
