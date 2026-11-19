import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { GlossaryTerm } from '../components/GlossaryTerm';

const TICKER_TAPE = [
  { sym: 'NIFTY 50', price: '24,360.50', chg: '+0.48%', up: true },
  { sym: 'NIFTY BANK', price: '52,470.80', chg: '-1.43%', up: false },
  { sym: 'HDFC BANK', price: '1,745.20', chg: '-0.85%', up: false },
  { sym: 'RELIANCE', price: '2,980.15', chg: '+1.12%', up: true },
  { sym: 'TCS', price: '4,150.00', chg: '+0.35%', up: true },
  { sym: 'INFOSYS', price: '1,895.60', chg: '-0.90%', up: false },
];

export const LandingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'explained' | 'abstention'>('explained');

  return (
    <div className="pt-4 pb-20">
      {/* Ticker Tape Bar */}
      <div className="w-full bg-white border border-slate-200/90 rounded-2xl py-2.5 px-4 mb-8 flex items-center gap-6 overflow-x-auto text-xs shadow-xs">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-800 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          NSE REAL-TIME SESSIONS
        </div>
        <div className="h-4 w-px bg-slate-200 shrink-0"></div>
        <div className="flex items-center gap-6 shrink-0 font-mono text-xs">
          {TICKER_TAPE.map((t) => (
            <div key={t.sym} className="flex items-center gap-2">
              <span className="font-bold text-slate-900">{t.sym}</span>
              <span className="text-slate-700 font-semibold">{t.price}</span>
              <span className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${t.up ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                {t.chg}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Hero Section (Asymmetric 2-Column inspired by AsgardHire / ReactBits) */}
      <section className="relative rounded-3xl p-8 sm:p-12 lg:p-16 mb-12 bg-white border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Subtle dot pattern and ethereal light background gradient */}
        <div className="absolute inset-0 bg-dot-pattern opacity-40 pointer-events-none"></div>
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-purple-100/50 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-amber-100/40 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Bold Typography & Metric Pill */}
          <div className="lg:col-span-7">
            {/* Tagline / Eyebrow */}
            <div className="inline-flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-purple-900 bg-purple-100/80 border border-purple-300/80 px-3.5 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-700"></span>
              AI that decodes market moves
            </div>

            {/* Giant Bold Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black tracking-tight text-slate-950 leading-[1.08] mb-6">
              The right evidence,<br />
              matched to<br />
              the right move.
            </h1>

            {/* Clear Subtitle (Darker & Crisper) */}
            <p className="text-base sm:text-lg text-slate-800 font-medium leading-relaxed max-w-xl mb-8">
              Analysts and traders find the verifiable root causes behind abnormal price moves in Indian indices and equities. Rooted in date-bounded news evidence, with zero look-ahead bias and honest abstentions.
            </p>

            {/* Live Metric Pill (AsgardHire Style) */}
            <div className="inline-flex items-center gap-3 bg-white border border-slate-300 rounded-xl px-4 py-2.5 shadow-xs mb-8 text-xs font-bold text-slate-800">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
              </span>
              <span>Market anomalies indexed</span>
              <span className="font-mono font-black text-slate-950 text-sm tracking-wide">25,580,238</span>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3.5">
              <Link
                to="/register"
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold px-6 py-3.5 rounded-xl text-sm shadow-xs transition-all flex items-center gap-2 hover:shadow-sm active:scale-98"
              >
                Launch Research Desk
                <span className="text-xs">→</span>
              </Link>
              <Link
                to="/login"
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold px-6 py-3.5 rounded-xl text-sm transition-all shadow-xs"
              >
                Sign In to Terminal
              </Link>
            </div>
          </div>

          {/* Right Column: 3D Geometric Sculpture & Glassmorphic Case Card */}
          <div className="lg:col-span-5 relative flex flex-col items-center justify-center">
            {/* 3D Geometric Knot Sculpture (SVG with Phong-style illumination highlights) */}
            <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center drop-shadow-2xl">
              <svg viewBox="0 0 400 400" className="w-full h-full transform hover:rotate-3 transition-transform duration-700 ease-out">
                <defs>
                  {/* Purple/Violet 3D gradient simulating curved tubular surface */}
                  <linearGradient id="knotGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#A855F7" />
                    <stop offset="35%" stopColor="#7C3AED" />
                    <stop offset="70%" stopColor="#6D28D9" />
                    <stop offset="100%" stopColor="#4C1D95" />
                  </linearGradient>
                  <linearGradient id="knotGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#C084FC" />
                    <stop offset="50%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#5B21B6" />
                  </linearGradient>
                  <linearGradient id="knotGrad3" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#9333EA" />
                    <stop offset="60%" stopColor="#7E22CE" />
                    <stop offset="100%" stopColor="#3B0764" />
                  </linearGradient>
                  {/* Specular highlight */}
                  <radialGradient id="specularGlow" cx="40%" cy="30%" r="50%">
                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                  </radialGradient>
                  <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="16" stdDeviation="20" floodColor="#4C1D95" floodOpacity="0.18" />
                  </filter>
                </defs>

                {/* Ambient occlusion shadow */}
                <ellipse cx="200" cy="360" rx="140" ry="24" fill="#64748B" opacity="0.12" filter="blur(16px)" />

                {/* 3D Interlocking Trefoil / Triquetra Loops */}
                <g filter="url(#softShadow)">
                  {/* Loop 1: Top Right */}
                  <path
                    d="M 200,60 C 270,60 350,140 330,220 C 310,290 230,270 200,200 C 170,270 90,290 70,220 C 50,140 130,60 200,60 Z"
                    fill="none"
                    stroke="url(#knotGrad1)"
                    strokeWidth="42"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Inner loop shading */}
                  <path
                    d="M 120,280 C 160,350 240,350 280,280 C 310,220 250,160 200,200 C 150,160 90,220 120,280 Z"
                    fill="none"
                    stroke="url(#knotGrad2)"
                    strokeWidth="40"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Specular curved highlights on tube */}
                  <path
                    d="M 200,74 C 255,74 318,142 304,208 C 290,265 230,245 200,195"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="10"
                    strokeLinecap="round"
                    opacity="0.55"
                  />
                  <path
                    d="M 134,272 C 168,332 232,332 266,272"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="8"
                    strokeLinecap="round"
                    opacity="0.45"
                  />
                </g>
              </svg>
            </div>

            {/* Tactile Floating Case Card (ReactBits style) */}
            <div className="w-full max-w-sm -mt-6 bg-white border border-slate-300 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-900 font-black text-xs flex items-center justify-center">
                    NB
                  </div>
                  <div>
                    <span className="font-bold text-xs text-slate-900">NIFTY BANK</span>
                    <span className="text-[10px] text-slate-600 block font-mono font-semibold">26 Nov Shock</span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  +1.45% (z = +2.30)
                </span>
              </div>
              <div className="mt-2.5 text-[11px] text-slate-800 font-medium leading-snug">
                Liquidity tailwinds & macro index rebalancing verified with zero look-ahead bias.
              </div>
              <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-slate-200 text-[10px]">
                <span className="text-slate-700 font-bold">Confidence: 85% Agreement</span>
                <span className="font-mono text-purple-900 font-bold bg-purple-100 px-1.5 py-0.5 rounded">
                  4 Sources [1-4]
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Bento Showcase (ReactBits Style) */}
      <section className="mb-16">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">INTERACTIVE INSPECTOR</span>
            <h2 className="text-2xl font-black text-slate-950 mt-1">Live Case File Architecture</h2>
          </div>
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-300 text-xs font-bold">
            <button
              onClick={() => setActiveTab('explained')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'explained' ? 'bg-white text-slate-950 shadow-xs font-bold' : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              Verified Move (7 Cases)
            </button>
            <button
              onClick={() => setActiveTab('abstention')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'abstention' ? 'bg-white text-slate-950 shadow-xs font-bold' : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              Honest Abstention (5 Cases)
            </button>
          </div>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Main Case Card */}
          <div className="lg:col-span-8 bento-card p-6 bg-white border border-slate-300 rounded-2xl flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-900">
                    NB
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-950">
                      NIFTY BANK — {activeTab === 'explained' ? '26 Nov Shock' : '09 Mar Session'}
                    </h3>
                    <p className="text-xs text-slate-600 font-medium">Benchmark Banking Index · NSE India</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold font-mono text-xl text-slate-950">52,470.80</div>
                  <div className={`text-xs font-bold px-2 py-0.5 rounded inline-block mt-0.5 ${
                    activeTab === 'explained' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {activeTab === 'explained' ? '+1.45% (Bullish Rally)' : '-1.43% (Bearish Shock)'}
                  </div>
                </div>
              </div>

              {/* Three Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
                    <GlossaryTerm termKey="regime">Price Regime</GlossaryTerm>
                  </span>
                  <div className={`font-bold text-sm ${activeTab === 'explained' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {activeTab === 'explained' ? '▲ Bullish Breakout' : '▼ Bearish Breakdown'}
                  </div>
                  <span className="text-[11px] text-slate-700 mt-1 block font-mono font-semibold">
                    z-score: {activeTab === 'explained' ? '+2.30' : '-2.20'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
                    <GlossaryTerm termKey="sentiment">News Sentiment</GlossaryTerm>
                  </span>
                  <div className="font-bold text-sm text-slate-950">
                    {activeTab === 'explained' ? 'Net Positive (+0.68)' : 'Conflicting Signals (-0.05)'}
                  </div>
                  <span className="text-[11px] text-slate-700 mt-1 block font-mono font-semibold">
                    {activeTab === 'explained' ? '4 dated articles' : '2 conflicting articles'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
                    <GlossaryTerm termKey="signalAgreement">Signal Agreement</GlossaryTerm>
                  </span>
                  <div className={`font-bold text-sm ${activeTab === 'explained' ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {activeTab === 'explained' ? '85% Agreement' : '30% (Abstention Threshold)'}
                  </div>
                  <span className="text-[11px] text-slate-700 mt-1 block font-mono font-semibold">
                    {activeTab === 'explained' ? 'High Confidence' : 'Engine Abstains'}
                  </span>
                </div>
              </div>

              {/* Attribution Content */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-medium leading-relaxed mb-4">
                {activeTab === 'explained' ? (
                  <>
                    <b className="text-slate-950 font-bold">Causal Attribution:</b> Nifty Bank experienced an abnormal positive return shock of +1.45% (z = +2.30) driven by positive macroeconomic revisions and banking sector liquidity tailwinds <span className="font-mono text-slate-950 font-bold bg-white px-1.5 py-0.5 rounded border border-slate-300">[1]</span>. Foreign Institutional Investors (FII) reversed net selling into private banking leaders <span className="font-mono text-slate-950 font-bold bg-white px-1.5 py-0.5 rounded border border-slate-300">[2]</span>.
                  </>
                ) : (
                  <>
                    <b className="text-slate-950 font-bold">Honest Abstention:</b> While a statistical downward price shock occurred (-1.43%, z = -2.20), verified news corpora within the strict date boundary show conflicting macroeconomic and corporate commentary. Because signal agreement (30%) falls below the 60% rigor threshold, the engine marks this event as <i>Unexplained by News</i> to prevent hallucinating false causality.
                  </>
                )}
              </div>
            </div>

            {/* Citations Row */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-700 font-medium">
              <span>{activeTab === 'explained' ? 'Sources: Financial Express, Economic Times, SEBI Bulletin' : 'Status: Abstention Logged to History'}</span>
              <Link to="/register" className="text-amber-700 font-bold hover:underline">
                Inspect full dossier →
              </Link>
            </div>
          </div>

          {/* Side Bento Card: Why Abstention Matters */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            <div className="bento-card p-6 bg-white border border-slate-300 rounded-2xl flex-1 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-900 bg-purple-100 px-2 py-0.5 rounded">
                CORE DIFFERENTIATOR
              </span>
              <h4 className="font-bold text-base text-slate-950 mt-2.5 mb-1.5">Zero Look-Ahead Bias</h4>
              <p className="text-xs text-slate-700 font-medium leading-relaxed">
                Most LLM tools read yesterday’s post-mortem analysis to "explain" why a stock moved. MarketMind restricts its knowledge strictly to headlines published on or before the anomaly session timestamp.
              </p>
            </div>

            <div className="bento-card p-6 bg-white border border-slate-300 rounded-2xl flex-1 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded">
                TAXONOMY
              </span>
              <h4 className="font-bold text-base text-slate-950 mt-2.5 mb-1.5">6 Causal Categories</h4>
              <p className="text-xs text-slate-700 font-medium leading-relaxed">
                Earnings surprises, macro policy shocks, regulatory interventions, executive changes, sector contagion, or honest noise. Every claim is mapped into a structured ontology.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works (3 Steps) */}
      <section className="mb-16">
        <div className="border-b border-slate-300 pb-3 mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">WORKFLOW</span>
          <h2 className="text-2xl font-black text-slate-950 mt-1">What the Engine Measures</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              num: '01',
              heading: 'Detect Price Anomaly',
              desc: 'Calculates rolling volatility, log returns, and standard score (z-score) to confirm a statistically significant shock beyond normal Brownian noise.',
            },
            {
              num: '02',
              heading: 'Bounded News Ingestion',
              desc: 'Retrieves headlines published up to session close. Discards post-hoc analyses published hours later to maintain strict historical determinism.',
            },
            {
              num: '03',
              heading: 'Attribution & Abstention',
              desc: 'Calculates directional sentiment, checks signal agreement, outputs verbatim citations, or honestly declares the move unexplained.',
            },
          ].map((s) => (
            <div key={s.num} className="p-6 bg-white border border-slate-300 rounded-2xl shadow-xs">
              <div className="text-2xl font-black text-amber-600 mb-2 font-mono">{s.num}</div>
              <h3 className="text-base font-bold text-slate-950 mb-2">{s.heading}</h3>
              <p className="text-xs text-slate-700 font-medium leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <div className="p-4 rounded-2xl bg-slate-100 border border-slate-300 text-xs text-slate-800 font-medium leading-relaxed text-center">
        <b className="text-slate-950 font-bold">Institutional Disclosure:</b> MarketMind is a historical causal research platform that analyzes past market movements using statistical price series and dated news corpora. It does not predict future prices and is not investment advice.
      </div>
    </div>
  );
};
