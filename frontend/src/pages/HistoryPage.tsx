import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getHistoryApi, deleteHistoryItemApi, clearHistoryApi } from '../api/history';
import { useToast } from '../components/Toast';
import { QueryHistoryItem } from '../types';

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: history, isLoading } = useQuery({
    queryKey: ['history'],
    queryFn: getHistoryApi,
  });

  const deleteOneMutation = useMutation({
    mutationFn: deleteHistoryItemApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
      showToast('History entry removed', 'info');
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: clearHistoryApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
      showToast('All query history cleared', 'info');
    },
  });

  return (
    <div className="history-page pt-6 max-w-desk mx-auto">
      {/* Header */}
      <div className="flex items-baseline justify-between border-b border-rule pb-3 mb-6">
        <div>
          <h1 className="font-serif text-3xl font-medium text-ink">Research Query History</h1>
          <p className="text-xs text-ink-soft mt-1">Audit log of questions analyzed on the research desk</p>
        </div>
        {history && history.length > 0 && (
          <button
            type="button"
            onClick={() => clearAllMutation.mutate()}
            className="text-xs text-loss hover:underline cursor-pointer"
          >
            Clear Entire History
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-xs italic text-ink-soft">Reviewing the case file…</div>
      ) : history && history.length > 0 ? (
        <div className="my-6 border-t border-ink">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-ink">
                <th className="text-left font-semibold text-ink-soft py-3 pr-4">Recorded Query</th>
                <th className="text-left font-semibold text-ink-soft py-3 pr-4">Intent</th>
                <th className="text-left font-semibold text-ink-soft py-3 pr-4">Resolved Tickers</th>
                <th className="text-left font-semibold text-ink-soft py-3 pr-4">Date</th>
                <th className="text-right font-semibold text-ink-soft py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item: QueryHistoryItem) => (
                <tr key={item.id} className="border-b border-rule hover:bg-paper-inset transition-colors">
                  <td className="py-3 pr-4 font-serif text-sm font-medium text-ink">
                    "{item.rawQuery}"
                  </td>
                  <td className="py-3 pr-4 uppercase text-[11px] font-mono text-ink-soft">
                    {item.intent}
                  </td>
                  <td className="py-3 pr-4 font-mono text-ink">
                    {item.resolvedSymbols?.join(', ') || '—'}
                  </td>
                  <td className="py-3 pr-4 text-ink-soft tabular-nums">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 text-right space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        const targetSym = item.resolvedSymbols?.[0] || 'NIFTYBANK';
                        navigate(`/?symbol=${targetSym}`);
                      }}
                      className="text-brass hover:underline cursor-pointer font-medium"
                    >
                      Re-run →
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteOneMutation.mutate(item.id)}
                      className="text-loss hover:underline cursor-pointer"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-12 border border-rule bg-paper-inset text-center text-xs text-ink-soft italic">
          No previous research queries recorded in this session.
        </div>
      )}
    </div>
  );
};
