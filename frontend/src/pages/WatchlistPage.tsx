import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getWatchlistApi, addToWatchlistApi, removeFromWatchlistApi } from '../api/watchlist';
import { useToast } from '../components/Toast';
import { WatchlistItem, Capabilities } from '../types';

interface WatchlistPageProps {
  capabilities?: Capabilities;
}

export const WatchlistPage: React.FC<WatchlistPageProps> = ({ capabilities }) => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [newSymbol, setNewSymbol] = useState('');

  const isEngineEnabled = capabilities?.engine?.enabled ?? true;

  const { data: watchlist, isLoading } = useQuery({
    queryKey: ['watchlist'],
    queryFn: getWatchlistApi,
  });

  const addMutation = useMutation({
    mutationFn: addToWatchlistApi,
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      setNewSymbol('');
      showToast(`${item.symbol} added to watchlist`, 'success');
    },
    onError: () => {
      showToast('Could not add symbol to watchlist', 'error');
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeFromWatchlistApi,
    onSuccess: (_, sym) => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      showToast(`${sym} removed from watchlist`, 'info');
    },
    onError: () => {
      showToast('Could not remove symbol', 'error');
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSymbol.trim()) {
      addMutation.mutate(newSymbol.trim());
    }
  };

  return (
    <div className="watchlist-page pt-6 max-w-desk mx-auto">
      {/* Header */}
      <div className="flex items-baseline justify-between border-b border-rule pb-3 mb-6">
        <div>
          <h1 className="font-serif text-3xl font-medium text-ink">Personal Watchlist</h1>
          <p className="text-xs text-ink-soft mt-1">
            {isEngineEnabled
              ? 'Monitored tickers with live regime classifications and narrative agreement'
              : 'Monitored tickers (engine offline — showing symbols only)'}
          </p>
        </div>
        <span className="text-xs font-mono text-ink-soft uppercase">— Tracked Cases</span>
      </div>

      {/* Add Symbol Input Form */}
      <form onSubmit={handleAdd} className="flex border-b-2 border-ink pb-2 my-6 max-w-md">
        <input
          type="text"
          value={newSymbol}
          onChange={(e) => setNewSymbol(e.target.value)}
          placeholder="Add ticker (e.g. TCS, RELIANCE, INFY)"
          className="flex-1 bg-transparent border-none outline-none font-serif text-lg text-ink placeholder:italic placeholder:text-ink-soft"
        />
        <button
          type="submit"
          disabled={addMutation.isPending}
          className="font-sans text-xs font-semibold text-ink hover:text-brass pl-4"
        >
          {addMutation.isPending ? 'Adding…' : '+ Add Symbol'}
        </button>
      </form>

      {/* Watchlist Table */}
      {isLoading ? (
        <div className="py-12 text-center text-xs italic text-ink-soft">Reviewing the case file…</div>
      ) : watchlist && watchlist.length > 0 ? (
        <div className="my-6 border-t border-ink">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-ink">
                <th className="text-left font-semibold text-ink-soft py-3 pr-4">Symbol</th>
                <th className="text-left font-semibold text-ink-soft py-3 pr-4">Company Name</th>
                {isEngineEnabled && (
                  <>
                    <th className="text-left font-semibold text-ink-soft py-3 pr-4">Regime</th>
                    <th className="text-left font-semibold text-ink-soft py-3 pr-4">Agreement</th>
                  </>
                )}
                <th className="text-right font-semibold text-ink-soft py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {watchlist.map((item: WatchlistItem) => (
                <tr key={item.id} className="border-b border-rule hover:bg-paper-inset transition-colors">
                  <td className="py-3 pr-4 font-mono font-medium text-sm">
                    {isEngineEnabled ? (
                      <Link to={`/?symbol=${item.symbol}`} className="text-ink hover:text-brass underline">
                        {item.symbol}
                      </Link>
                    ) : (
                      <span className="text-ink">{item.symbol}</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-ink-soft">{item.name || item.symbol}</td>
                  {isEngineEnabled && (
                    <>
                      <td className="py-3 pr-4 capitalize font-serif text-sm">
                        {item.regime || '—'}
                      </td>
                      <td className="py-3 pr-4">
                        {item.agreement ? (
                          <span
                            className={`px-2 py-0.5 text-[11px] font-semibold ${
                              item.agreement === 'aligned'
                                ? 'bg-[rgb(var(--c-tint))] text-gain'
                                : item.agreement === 'diverging'
                                ? 'bg-[rgb(var(--c-losstint))] text-loss'
                                : 'bg-paper-inset text-ink-soft border border-rule'
                            }`}
                          >
                            {item.agreement.charAt(0).toUpperCase() + item.agreement.slice(1)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </>
                  )}
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      onClick={() => removeMutation.mutate(item.symbol)}
                      disabled={removeMutation.isPending}
                      className="text-loss hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-12 border border-rule bg-paper-inset text-center text-xs text-ink-soft italic">
          No tracked symbols in your watchlist. Search or add a symbol above.
        </div>
      )}
    </div>
  );
};
