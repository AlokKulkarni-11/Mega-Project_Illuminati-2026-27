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
      <button type="button" onClick={() => { setI(0); setOpen(true); }}
        className="fixed bottom-4 right-4 z-30 bg-ink text-paper text-xs px-3 py-2 non-printable">Guide</button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Guided tour" className="fixed inset-0 z-50 bg-ink/40 flex items-end sm:items-center justify-center p-4"
          onKeyDown={(e) => e.key === 'Escape' && close()}>
          <div className="bg-paper border border-ink w-full max-w-md p-5">
            <div className="text-[11px] uppercase tracking-wider text-brass">Step {i + 1} of {STEPS.length}</div>
            <h2 className="font-serif text-2xl mt-1">{s.title}</h2>
            <p className="text-sm text-ink-soft mt-2">{s.body}</p>
            <div className="flex gap-1 my-4" aria-hidden>
              {STEPS.map((_, n) => <span key={n} className={`h-1 flex-1 ${n <= i ? 'bg-ink' : 'bg-rule'}`} />)}
            </div>
            <div className="flex justify-between items-center">
              <button type="button" className="text-xs underline text-ink-soft" onClick={close}>Skip tour</button>
              <div className="flex gap-2">
                {i > 0 && <button type="button" className="border border-ink px-3 py-1.5 text-sm" onClick={() => go(i - 1)}>Back</button>}
                {i < STEPS.length - 1
                  ? <button type="button" autoFocus className="bg-ink text-paper px-3 py-1.5 text-sm" onClick={() => go(i + 1)}>Next</button>
                  : <button type="button" autoFocus className="bg-ink text-paper px-3 py-1.5 text-sm" onClick={close}>Done</button>}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
