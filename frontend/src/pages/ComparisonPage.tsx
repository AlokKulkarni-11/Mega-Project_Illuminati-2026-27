import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getComparisonApi } from '../api/engine';
import { ComparisonRow } from '../types';

export const ComparisonPage: React.FC = () => {
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([
    'TCS',
    'INFY',
    'RELIANCE',
    'HDFCBANK',
  ]);

  const { data: comparison, isLoading } = useQuery({
    queryKey: ['compare', selectedSymbols],
    queryFn: () => getComparisonApi(selectedSymbols),
  });

  const availableSymbols = ['NIFTYBANK', 'TCS', 'INFY', 'RELIANCE', 'HDFCBANK'];

  const toggleSymbol = (sym: string) => {
    if (selectedSymbols.includes(sym)) {
      if (selectedSymbols.length > 2) {
        setSelectedSymbols(selectedSymbols.filter((s) => s !== sym));
      }
    } else {
      if (selectedSymbols.length < 4) {
        setSelectedSymbols([...selectedSymbols, sym]);
      }
    }
  };

  return (
    <div className="compare-page pt-6 max-w-desk mx-auto">
      {/* Header */}
      <div className="flex items-baseline justify-between border-b border-rule pb-3 mb-6">
        <div>
          <h1 className="font-serif text-3xl font-medium text-ink">Peer & Index Comparison</h1>
          <p className="text-xs text-ink-soft mt-1">Cross-instrument regime, latest close, and narrative agreement</p>
        </div>
        <span className="text-xs font-mono text-ink-soft uppercase">— 2 to 4 Instruments</span>
      </div>

      {/* Symbol Selection Chips */}
      <div className="flex items-center space-x-2 my-4 flex-wrap gap-2 text-xs">
        <span className="text-ink-soft">Select 2–4 instruments:</span>
        {availableSymbols.map((sym) => {
          const isSelected = selectedSymbols.includes(sym);
          return (
            <button
              key={sym}
              type="button"
              onClick={() => toggleSymbol(sym)}
              className={`px-3 py-1 border transition-colors ${
                isSelected
                  ? 'border-ink bg-brass-soft text-ink font-semibold'
                  : 'border-rule bg-paper-inset text-ink-soft hover:border-ink hover:text-ink'
              }`}
            >
              {sym}
            </button>
          );
        })}
      </div>

      {/* Comparison Table */}
      {isLoading ? (
        <div className="py-12 text-center text-xs italic text-ink-soft">Reviewing the case file…</div>
      ) : (
        <div className="my-6 border-t border-ink">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-ink">
                <th className="text-left font-semibold text-ink-soft py-3 pr-4">Instrument</th>
                <th className="text-right font-semibold text-ink-soft py-3 pr-4">Latest Price</th>
                <th className="text-right font-semibold text-ink-soft py-3 pr-4">Net Change</th>
                <th className="text-left font-semibold text-ink-soft py-3 pr-4">Price Regime</th>
                <th className="text-left font-semibold text-ink-soft py-3">Signal Agreement</th>
              </tr>
            </thead>
            <tbody>
              {comparison?.rows?.map((row: ComparisonRow) => {
                const isGain = row.changePct >= 0;
                return (
                  <tr key={row.symbol} className="border-b border-rule hover:bg-paper-inset transition-colors">
                    <td className="py-3.5 pr-4 font-serif text-base font-medium text-ink">{row.symbol}</td>
                    <td className="py-3.5 pr-4 text-right font-mono text-sm tabular-nums text-ink">
                      ₹{Number(row.latestPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`py-3.5 pr-4 text-right font-semibold text-sm tabular-nums ${isGain ? 'text-gain' : 'text-loss'}`}>
                      {isGain ? '▲ +' : '▼ '}{row.changePct}%
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className={`capitalize font-serif ${isGain ? 'text-gain' : 'text-loss'}`}>
                        {row.regime}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <span
                        className={`px-2 py-0.5 text-[11px] font-semibold ${
                          row.agreement === 'aligned'
                            ? 'bg-[rgb(var(--c-tint))] text-gain'
                            : row.agreement === 'diverging'
                            ? 'bg-[rgb(var(--c-losstint))] text-loss'
                            : 'bg-paper-inset text-ink-soft border border-rule'
                        }`}
                      >
                        {row.agreement.charAt(0).toUpperCase() + row.agreement.slice(1)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer Disclaimer */}
      <footer className="mt-12 pt-4 border-t border-rule text-xs text-ink-soft leading-relaxed">
        MarketMind is a research and explanation tool built on historical price and news data. It does not predict future prices and is not investment advice. Explanations are generated from retrieved sources and may be incomplete.
      </footer>
    </div>
  );
};
