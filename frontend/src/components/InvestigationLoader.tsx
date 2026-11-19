import React, { useState, useEffect } from 'react';

interface InvestigationLoaderProps {
  query: string;
  symbol?: string;
  onCancel?: () => void;
}

interface PipelineStage {
  id: number;
  label: string;
  description: string;
  terminalLog: string;
}

const STAGES: PipelineStage[] = [
  {
    id: 1,
    label: 'Query Understanding & Entity Resolution',
    description: 'Parsing natural language semantics, extracting ticker symbols, dates & event catalysts...',
    terminalLog: 'NLP intent parsed -> financial entity & date window identified',
  },
  {
    id: 2,
    label: 'OHLCV Volatility & Anomaly Scanning',
    description: 'Scanning tick histories, computing rolling standard deviations, return z-scores & baseline volumes...',
    terminalLog: 'Calculated 60-day baseline volatility | Z-score threshold evaluated',
  },
  {
    id: 3,
    label: 'Financial Press Retrieval & FinBERT Sentiment',
    description: 'Cross-referencing verified financial news across Reuters, Economic Times & Livemint...',
    terminalLog: 'FinBERT neural model scored news sentiment & directional weights',
  },
  {
    id: 4,
    label: 'Narrative Agreement & Regime Alignment',
    description: 'Cross-checking statistical price regime against news consensus to detect alignment or divergence...',
    terminalLog: 'Signal agreement matrix verified | Cross-checking sentiment vs momentum',
  },
  {
    id: 5,
    label: 'Causal Synthesis & Citation Verification',
    description: 'Assembling final case file, verifying citations and compiling structured causal dossier...',
    terminalLog: 'Causal analysis formulated with verified press citations & zero fake data',
  },
];

const MARKET_FACTS = [
  {
    tag: 'ANTI-HALLUCINATION',
    fact: 'MarketMind enforces strict honest abstention: if verifiable news citations cannot be established for a move, the engine abstains rather than making up a speculative story.',
  },
  {
    tag: 'STATISTICAL Z-SCORE',
    fact: 'A return z-score exceeding ±2.0 standard deviations represents a move occurring in less than 5% of typical trading sessions across a 60-day baseline window.',
  },
  {
    tag: 'SIGNAL AGREEMENT',
    fact: 'When price momentum and news tone agree (Aligned), breakout continuation is statistically higher. Divergence often signals an overreaction or delayed market absorption.',
  },
  {
    tag: 'INSTITUTIONAL LIQUIDITY',
    fact: 'In the Indian market (NSE), Domestic Institutional Investors (DIIs) such as mutual funds and insurance houses provide crucial structural liquidity against foreign volatility.',
  },
  {
    tag: 'PRICE CLASSIFIER',
    fact: 'MarketMind leverages technical features (SMA 20/50, RSI 14, Volume Z-scores) to classify price regimes into Bullish, Bearish, or Consolidating momentum states.',
  },
];

export const InvestigationLoader: React.FC<InvestigationLoaderProps> = ({
  query,
  symbol,
  onCancel,
}) => {
  const [currentStageIdx, setCurrentStageIdx] = useState<number>(0);
  const [progress, setProgress] = useState<number>(12);
  const [triviaIdx, setTriviaIdx] = useState<number>(0);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    `[0.05s] Ingesting inquiry: "${query || 'Analyzing financial inquiry'}"`,
  ]);

  // Stage advancement timer
  useEffect(() => {
    const stageInterval = setInterval(() => {
      setCurrentStageIdx((prev) => {
        if (prev < STAGES.length - 1) {
          const next = prev + 1;
          const nextStage = STAGES[next];
          const timeOffset = ((next * 0.45) + 0.1).toFixed(2);
          setTerminalLogs((logs) => [
            ...logs,
            `[${timeOffset}s] ${nextStage.terminalLog}`,
          ]);
          return next;
        }
        return prev;
      });
    }, 700);

    return () => clearInterval(stageInterval);
  }, []);

  // Smooth progress bar increment
  useEffect(() => {
    const progressTimer = setInterval(() => {
      setProgress((old) => {
        if (old >= 94) return 94; // Hold near finish until real data returns
        const jump = Math.floor(Math.random() * 5) + 3;
        return Math.min(94, old + jump);
      });
    }, 180);

    return () => clearInterval(progressTimer);
  }, []);

  // Trivia carousel timer
  useEffect(() => {
    const triviaTimer = setInterval(() => {
      setTriviaIdx((prev) => (prev + 1) % MARKET_FACTS.length);
    }, 3200);

    return () => clearInterval(triviaTimer);
  }, []);

  const activeStage = STAGES[currentStageIdx];
  const activeTrivia = MARKET_FACTS[triviaIdx];

  return (
    <div className="w-full my-6 bg-paper border border-rule rounded-3xl p-6 sm:p-8 shadow-sm transition-all animate-fadeIn">
      {/* Header with Radar Icon & Query Context */}
      <div className="flex items-start justify-between border-b border-rule pb-5 mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          {/* Animated Neural Radar Pulse */}
          <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700">
            <span className="absolute w-10 h-10 rounded-full bg-amber-400/30 animate-ping"></span>
            <span className="absolute w-6 h-6 rounded-full bg-amber-500/40 animate-pulse"></span>
            <svg
              className="w-6 h-6 text-amber-600 dark:text-amber-400 relative z-10 animate-spin"
              style={{ animationDuration: '4s' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
              />
            </svg>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                ML Service Active Analysis
              </span>
              {symbol && (
                <span className="text-xs font-mono font-bold text-ink bg-paper-inset px-2 py-0.5 rounded border border-rule">
                  Target: {symbol}
                </span>
              )}
            </div>
            <h3 className="font-serif text-lg font-bold text-ink mt-1 flex items-center gap-2">
              Investigating: <span className="text-brass italic font-sans font-semibold">"{query}"</span>
            </h3>
          </div>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-ink-soft hover:text-ink px-3 py-1.5 rounded-lg border border-rule hover:bg-paper-inset transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        )}
      </div>

      {/* Progress Bar with Estimated Metric */}
      <div className="mb-6">
        <div className="flex justify-between items-center text-xs mb-2">
          <span className="font-bold text-ink flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Stage {currentStageIdx + 1} of {STAGES.length}: {activeStage.label}
          </span>
          <span className="font-mono font-bold text-brass">{progress}% Complete</span>
        </div>
        <div className="w-full h-2.5 bg-paper-inset rounded-full overflow-hidden border border-rule p-0.5">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-500 rounded-full transition-all duration-300 ease-out shadow-xs"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Grid: Left = Multi-Stage Pipeline Checklist | Right = Live Terminal & Trivia */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Stage Progression Checklist (5 cols) */}
        <div className="lg:col-span-5 space-y-2.5">
          {STAGES.map((s, idx) => {
            const isDone = idx < currentStageIdx;
            const isCurrent = idx === currentStageIdx;
            return (
              <div
                key={s.id}
                className={`flex items-start gap-3 p-3 rounded-2xl border transition-all ${
                  isCurrent
                    ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 shadow-xs ring-1 ring-amber-400/20'
                    : isDone
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                    : 'bg-paper-inset/40 border-rule/60 opacity-60'
                }`}
              >
                {/* Step Status Badge */}
                <div className="mt-0.5 shrink-0">
                  {isDone ? (
                    <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                      ✓
                    </div>
                  ) : isCurrent ? (
                    <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold animate-pulse shadow-xs">
                      {s.id}
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-rule text-ink-soft flex items-center justify-center text-[10px] font-mono">
                      {s.id}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-bold leading-tight ${isCurrent ? 'text-ink' : isDone ? 'text-emerald-800 dark:text-emerald-300' : 'text-ink-soft'}`}>
                    {s.label}
                  </div>
                  {isCurrent && (
                    <p className="text-[11px] text-ink-soft mt-1 leading-snug animate-fadeIn">
                      {s.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Terminal Stream & Engaging Financial Trivia (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          {/* Simulated Terminal Diagnostics Box */}
          <div className="bg-slate-950 text-emerald-400 p-4 rounded-2xl font-mono text-[11px] leading-relaxed border border-slate-800 shadow-inner overflow-hidden flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                <span className="ml-1 text-slate-300 font-bold">ML Service Log Stream</span>
              </span>
              <span className="text-slate-500">FinBERT · Gemini · XGBoost</span>
            </div>

            <div className="space-y-1.5 overflow-y-auto max-h-36 pr-1">
              {terminalLogs.map((log, index) => (
                <div key={index} className="flex items-start gap-1.5 text-slate-300">
                  <span className="text-emerald-500 select-none">&gt;</span>
                  <span className="font-mono">{log}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 text-amber-400 font-mono animate-pulse">
                <span className="text-amber-500 select-none">&gt;</span>
                <span>Processing next tensor pipeline milestone...</span>
              </div>
            </div>
          </div>

          {/* Interactive Financial Trivia / Market Knowledge Card */}
          <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 font-bold text-sm">
              💡
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                  {activeTrivia.tag}
                </span>
                <span className="text-[10px] text-ink-soft">
                  MarketMind Research Desk
                </span>
              </div>
              <p className="text-xs text-ink leading-relaxed transition-opacity duration-300">
                {activeTrivia.fact}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
