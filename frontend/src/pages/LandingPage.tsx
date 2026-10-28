import React from 'react';
import { Link } from 'react-router-dom';
import { GlossaryTerm } from '../components/GlossaryTerm';

const STEPS = [
  ['1', 'Ask', 'Type a question like “why did Nifty Bank fall on 9 March?” or pick an index or stock.'],
  ['2', 'We investigate', 'We find the unusually large price move, then read news published on or before that day.'],
  ['3', 'You get a case file', 'A plain-English cause with its sources, a confidence level, and an honest “unexplained” when we can’t find one.'],
];
const FACTORS: [string, string, string][] = [
  ['z-score', 'How unusual was the move?', 'We compare each day’s return with the instrument’s own history. Only truly unusual days get investigated.'],
  ['sentiment', 'What did the news say?', 'Headlines around the date are read for a bullish, bearish or neutral tone.'],
  ['causal category', 'What kind of driver?', 'Geopolitical, regulatory, macro, company-specific or market flows.'],
  ['signal agreement', 'Do price and news agree?', 'If the news points the same way as the price, the explanation is stronger. If not, we say so.'],
  ['confidence', 'How sure are we?', 'High, medium or low, based on how many dated sources support the cause.'],
  ['abstention', 'Knowing when to stay quiet', 'With no verified driver, MarketMind says “unexplained” instead of guessing.'],
];
const TOOLS = [
  ['Research Desk', 'Ask a question and read the explanation, with a candlestick chart.'],
  ['Market Pulse', 'A one-glance read on market breadth, sectors and the most unusual moves.'],
  ['Compare', 'Put 2–4 instruments side by side.'],
  ['Calculators', 'SIP, step-up SIP, lumpsum and goal planning. These work with no market data.'],
];

export const LandingPage: React.FC = () => (
  <div className="pt-10">
    <section className="border-b border-ink pb-10">
      <p className="text-xs uppercase tracking-widest text-brass mb-3">Market research, explained</p>
      <h1 className="font-serif text-4xl md:text-5xl leading-tight max-w-2xl">Why did the market move? Get the answer with the evidence.</h1>
      <p className="mt-4 text-ink-soft max-w-xl">
        MarketMind looks at big price moves in Indian indices and stocks and explains them in plain English, citing the news behind them. No jargon needed, and no predictions.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/register" className="bg-ink text-paper px-5 py-2.5 text-sm">Create a free account</Link>
        <Link to="/login" className="border border-ink px-5 py-2.5 text-sm">Sign in</Link>
      </div>
    </section>

    <section className="py-10 border-b border-rule">
      <h2 className="font-serif text-2xl mb-6">How it works</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {STEPS.map(([n, t, d]) => (
          <div key={n} className="border-t border-ink pt-3">
            <div className="font-serif text-3xl text-brass">{n}</div>
            <h3 className="font-serif text-lg mt-1">{t}</h3>
            <p className="text-sm text-ink-soft mt-1">{d}</p>
          </div>
        ))}
      </div>
    </section>

    <section className="py-10 border-b border-rule">
      <h2 className="font-serif text-2xl mb-1">What we look at</h2>
      <p className="text-sm text-ink-soft mb-6">Hover or tap any underlined term for a short definition.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
        {FACTORS.map(([k, q, d]) => (
          <div key={k} className="border-t border-rule pt-2">
            <div className="text-xs uppercase tracking-wider text-ink-soft"><GlossaryTerm termKey={k} /></div>
            <h3 className="font-serif text-lg">{q}</h3>
            <p className="text-sm text-ink-soft">{d}</p>
          </div>
        ))}
      </div>
    </section>

    <section className="py-10 border-b border-rule">
      <h2 className="font-serif text-2xl mb-6">What’s inside</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TOOLS.map(([t, d]) => (
          <div key={t} className="bg-paper-inset border border-rule p-4"><h3 className="font-serif text-lg">{t}</h3><p className="text-sm text-ink-soft">{d}</p></div>
        ))}
      </div>
    </section>

    <section className="py-10">
      <div className="border-l-4 border-brass bg-paper-inset p-4 text-sm text-ink-soft max-w-2xl">
        <b className="text-ink">What MarketMind is not.</b> It explains the past using historical prices and news. It does not predict future prices and is not investment advice. Explanations come from retrieved sources and can be incomplete.
      </div>
    </section>
  </div>
);
