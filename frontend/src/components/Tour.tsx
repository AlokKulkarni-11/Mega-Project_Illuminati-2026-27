import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const STEPS: { title: string; body: string; to?: string }[] = [
  { title: 'Welcome to MarketMind', body: 'This 1-minute tour shows what each part is for. You can reopen it any time with the Guide button in the corner.' },
  { title: 'Research Desk', body: 'Start here. Ask “why did Nifty Bank fall?” or pick an instrument. Use the chart controls to change range, interval and candlesticks. Brass ▼ markers on the chart are unusual days: click one to read why it moved.', to: '/' },
  { title: 'Reading an explanation', body: 'Each case file gives the cause, the sources behind it, a confidence level and whether price and news agree. If nothing verifiable exists, it says “unexplained” on purpose.', to: '/' },
  { title: 'Market Pulse', body: 'A one-glance view: overall mood dial, sector tiles and the most unusual moves. Good for deciding what to investigate.', to: '/pulse' },
  { title: 'Compare & Digest', body: 'Compare puts 2–4 instruments side by side. The Daily Digest summarises the day and your watchlist.', to: '/compare' },
  { title: 'Watchlist & History', body: 'Star instruments to follow them. History keeps your past questions so you can re-run them.', to: '/watchlist' },
  { title: 'Calculators', body: 'SIP, step-up SIP, lumpsum and goal planning. These work even without market data.', to: '/calculators' },
  { title: 'Glossary & Settings', body: 'Underlined terms show a short definition on hover or tap. Settings holds your chart defaults and display options.', to: '/glossary' },
];

export const Tour: React.FC = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const key = user ? `mm_tour_done_${user.email}` : '';
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => { if (key && !localStorage.getItem(key)) setOpen(true); }, [key]);
  if (!user) return null;

  const close = () => { localStorage.setItem(key, '1'); setOpen(false); setI(0); };
  const s = STEPS[i];
  const go = (n: number) => { setI(n); const t = STEPS[n].to; if (t) nav(t); };

  return (
    <>
      <button
        type="button"
        onClick={() => { setI(0); setOpen(true); }}
        className="fixed bottom-4 right-4 z-30 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm text-xs font-bold px-3.5 py-2 rounded-xl non-printable cursor-pointer transition-all flex items-center gap-1.5"
      >
        <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Guide
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Guided tour"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4"
          onKeyDown={(e) => e.key === 'Escape' && close()}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Step {i + 1} of {STEPS.length}</div>
            <h2 className="font-serif text-2xl font-bold mt-1 text-slate-950 dark:text-slate-100">{s.title}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">{s.body}</p>
            <div className="flex gap-1.5 my-5" aria-hidden>
              {STEPS.map((_, n) => (
                <span
                  key={n}
                  className={`h-1.5 rounded-full flex-1 transition-all ${
                    n <= i ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>
            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                onClick={close}
              >
                Skip tour
              </button>
              <div className="flex gap-2">
                {i > 0 && (
                  <button
                    type="button"
                    className="border border-slate-300 dark:border-slate-700 px-3.5 py-1.5 text-xs font-bold rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                    onClick={() => go(i - 1)}
                  >
                    Back
                  </button>
                )}
                {i < STEPS.length - 1 ? (
                  <button
                    type="button"
                    autoFocus
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-4 py-1.5 text-xs font-black rounded-lg shadow-xs cursor-pointer transition-colors"
                    onClick={() => go(i + 1)}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    autoFocus
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-4 py-1.5 text-xs font-black rounded-lg shadow-xs cursor-pointer transition-colors"
                    onClick={close}
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
