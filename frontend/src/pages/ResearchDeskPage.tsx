import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CandleChart } from '../components/CandleChart';
import { ChartControls } from '../components/ChartControls';
import { aggregate, RANGE_DAYS, RangeKey, ChartType, Interval } from '../features/chart/chartUtils';
import { loadChartPrefs } from './SettingsPage';
import { Sparkline } from '../components/Sparkline';
import { GlossaryTerm } from '../components/GlossaryTerm';
import { useToast } from '../components/Toast';
import { InvestigationLoader } from '../components/InvestigationLoader';
import {
  getInstrumentsApi,
  getPricesApi,
  getAnomaliesApi,
  getExplanationApi,
} from '../api/engine';
import { addToWatchlistApi, checkWatchlistApi, removeFromWatchlistApi } from '../api/watchlist';
import { resolveQueryApi } from '../api/query';
import { submitFeedbackApi } from '../api/feedback';
import { Anomaly } from '../types';

export const ResearchDeskPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [queryInput, setQueryInput] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState('SBIN');
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-15');
  const [isInvestigating, setIsInvestigating] = useState<boolean>(false);
  const [investigatingQueryText, setInvestigatingQueryText] = useState<string>('');
  const [emptyNote, setEmptyNote] = useState<string | null>(null);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<'helpful' | 'unhelpful' | null>(null);
  const [showSourcesTrail, setShowSourcesTrail] = useState(false);
  const [chartOpts, setChartOpts] = useState<{ range: RangeKey; interval: Interval; type: ChartType; sma: boolean; volume: boolean }>(() => ({ range: '6M', sma: true, volume: true, ...loadChartPrefs() }));

  // Fetch instruments
  const { data: instruments } = useQuery({
    queryKey: ['instruments'],
    queryFn: getInstrumentsApi,
  });

  // Fetch anomalies for the current symbol
  const { data: anomalies, isLoading: loadingAnomalies } = useQuery({
    queryKey: ['anomalies', selectedSymbol],
    queryFn: () => getAnomaliesApi(selectedSymbol),
  });

  // Pick default anomaly date when anomalies load: prioritize confirmed anomaly with verified news & price sentiment (our USP)
  useEffect(() => {
    if (anomalies && anomalies.length > 0 && !selectedDate) {
      const confirmed =
        anomalies.find((a: Anomaly) => a.confidence === 'high' || a.confidence === 'medium') ||
        anomalies[0];
      setSelectedDate(confirmed.date);
    }
  }, [anomalies, selectedDate]);

  // Fetch price history
  const { data: prices } = useQuery({
    queryKey: ['prices', selectedSymbol, 'chart'],
    queryFn: () => getPricesApi(selectedSymbol, 260),
  });

  // Fetch explanation for symbol + date
  const { data: explanation, isLoading: loadingExplanation } = useQuery({
    queryKey: ['explanation', selectedSymbol, selectedDate],
    queryFn: () => getExplanationApi(selectedSymbol, selectedDate || undefined),
    enabled: !!selectedSymbol,
  });

  // Watchlist status
  useEffect(() => {
    checkWatchlistApi(selectedSymbol)
      .then(setIsInWatchlist)
      .catch(() => setIsInWatchlist(false));
  }, [selectedSymbol]);

  const handleToggleWatchlist = async () => {
    try {
      if (isInWatchlist) {
        await removeFromWatchlistApi(selectedSymbol);
        setIsInWatchlist(false);
        showToast(`${selectedSymbol} removed from watchlist`, 'info');
      } else {
        await addToWatchlistApi(selectedSymbol);
        setIsInWatchlist(true);
        showToast(`${selectedSymbol} added to watchlist`, 'success');
      }
    } catch {
      showToast('Watchlist operation failed', 'error');
    }
  };

  const handleRunQuery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = queryInput.trim();
    if (!query) return;

    setIsInvestigating(true);
    setInvestigatingQueryText(query);
    setEmptyNote(null);
    const startTime = Date.now();

    const pacingDelay = async () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < 1500) {
        await new Promise((r) => setTimeout(r, 1500 - elapsed));
      }
    };

    try {
      let matchedSymbol: string | null = null;
      let targetDt: string = '';

      // 1. Try rich natural language query understanding via Python ML service
      try {
        const mlResp = await fetch('http://localhost:8000/api/query/understand', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });
        if (mlResp.ok) {
          const mlData = await mlResp.json();
          if (mlData.ticker) {
            matchedSymbol = mlData.ticker;
            targetDt = mlData.end_date || mlData.start_date || '';
            
            if (!targetDt && mlData.date_expression) {
              const lowerExpr = mlData.date_expression.toLowerCase();
              if (lowerExpr.includes('feb')) targetDt = '2025-02-28';
              else if (lowerExpr.includes('jan')) targetDt = '2026-01-31';
              else if (lowerExpr.includes('mar')) targetDt = '2026-03-31';
              else if (lowerExpr.includes('apr')) targetDt = '2025-04-30';
              else if (lowerExpr.includes('jun')) targetDt = '2025-06-30';
              else if (lowerExpr.includes('nov')) targetDt = '2025-11-26';
            }
          }
        }
      } catch {
        // Fall back to Spring Boot query resolution
      }

      // 2. Fallback to Spring Boot /api/query/resolve if ML didn't return a ticker
      if (!matchedSymbol) {
        const res = await resolveQueryApi(query);
        if (res.symbols && res.symbols.length > 0) {
          matchedSymbol = res.symbols[0];
          targetDt = '';
        } else {
          await pacingDelay();
          setEmptyNote(res.unmatchedMessage || `No tracked historical dossier found for "${query}".`);
          setIsInvestigating(false);
          return;
        }
      }

      await pacingDelay();
      setSelectedSymbol(matchedSymbol);
      setSelectedDate(targetDt || (matchedSymbol === 'NIFTYBANK' ? '2026-02-01' : '2026-09-15'));
      setEmptyNote(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['explanation'] }),
        queryClient.invalidateQueries({ queryKey: ['anomalies'] }),
        queryClient.invalidateQueries({ queryKey: ['prices'] }),
      ]);
      setTimeout(() => {
        document.getElementById('explanation-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    } catch {
      await pacingDelay();
      setEmptyNote('Unable to resolve query at this time.');
    } finally {
      setIsInvestigating(false);
    }
  };

  const handleSelectChip = (sym: string) => {
    setSelectedSymbol(sym);
    if (sym === 'NIFTYBANK') {
      setSelectedDate('2026-02-01');
    } else {
      setSelectedDate('2026-09-15');
    }
    setQueryInput('');
    setEmptyNote(null);
    setFeedbackGiven(null);
    queryClient.invalidateQueries({ queryKey: ['explanation'] });
    queryClient.invalidateQueries({ queryKey: ['anomalies'] });
    queryClient.invalidateQueries({ queryKey: ['prices'] });
  };

  const handleFeedback = async (helpful: boolean) => {
    if (!selectedDate) return;
    try {
      await submitFeedbackApi({
        symbol: selectedSymbol,
        anomalyDate: selectedDate,
        helpful,
      });
      setFeedbackGiven(helpful ? 'helpful' : 'unhelpful');
      showToast('Thank you for your feedback on this case file.', 'success');
    } catch {
      showToast('Could not record feedback', 'error');
    }
  };

  const currentInstrument = instruments?.find((i) => i.symbol === selectedSymbol);
  const instrumentName = currentInstrument ? currentInstrument.name : selectedSymbol;

  const currentPricePoint = prices?.points && prices.points.length > 0
    ? (selectedDate ? (prices.points.find((p) => p.date === selectedDate) || prices.points[prices.points.length - 1]) : prices.points[prices.points.length - 1])
    : null;

  const currentPriceStr = currentPricePoint
    ? `₹${Number(currentPricePoint.close).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    : '—';

  const returnPct = explanation && explanation.returnPct !== undefined && explanation.returnPct !== null
    ? Number(explanation.returnPct)
    : (currentPricePoint?.open && currentPricePoint?.close
        ? ((currentPricePoint.close - currentPricePoint.open) / currentPricePoint.open) * 100
        : null);
  const isGain = returnPct !== null ? returnPct >= 0 : false;
  const changeStr = returnPct !== null ? `${isGain ? '+' : ''}${returnPct.toFixed(2)}%` : '—';

  return (
    <div className="desk pt-6">
      {/* Query Desk Input & Quick Chips */}
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-brass flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-brass"></span>
          Natural Language Financial Inquiry
        </span>
        {!queryInput && (
          <span className="text-[11px] font-mono text-ink-soft bg-paper-inset px-2.5 py-0.5 rounded-full border border-rule flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Featured USP Case File: <b className="text-ink">{selectedSymbol}</b> ({selectedDate || 'Budget Shock'}) · Live News &amp; Price Sentiment
          </span>
        )}
      </div>

      <form onSubmit={handleRunQuery} className="query-row flex bg-paper border border-rule focus-within:border-brass focus-within:ring-1 focus-within:ring-brass rounded-lg px-4 py-2.5 items-center shadow-sm transition-all gap-3">
        <input
          id="queryInput"
          type="text"
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          placeholder="Ask in plain language, e.g. 'Why did SBI surge?', 'Why is TCS moving?', 'Why did HDFC Bank fall?'"
          className="flex-1 bg-transparent border-none outline-none text-base text-ink placeholder:text-ink-soft/60"
        />
        <button
          type="submit"
          disabled={isInvestigating}
          className="bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer shrink-0 shadow-xs active:scale-98 disabled:opacity-80 flex items-center gap-1.5"
        >
          {isInvestigating ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin text-slate-950" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>Analyzing Query…</span>
            </>
          ) : (
            <span>Investigate Move →</span>
          )}
        </button>
      </form>

      {/* Quick Pick Chips */}
      <div className="chips flex gap-2 mt-3 flex-wrap items-center">
        <span className="text-xs text-ink-soft mr-1">Trending USP:</span>
        {[
          { sym: 'SBIN', label: 'SBI (SBIN)' },
          { sym: 'TCS', label: 'TCS' },
          { sym: 'HDFCBANK', label: 'HDFC Bank' },
          { sym: 'NIFTYBANK', label: 'Nifty Bank' },
          { sym: 'NIFTY', label: 'Nifty 50' },
        ].map((c) => (
          <button
            key={c.sym}
            type="button"
            onClick={() => handleSelectChip(c.sym)}
            disabled={isInvestigating}
            className={`text-xs px-3 py-1 rounded-full border transition-all ${
              selectedSymbol === c.sym
                ? 'border-brass bg-brass text-white font-semibold shadow-sm'
                : 'border-rule text-ink-soft bg-paper hover:border-brass/40 hover:text-ink'
            } disabled:opacity-50`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {emptyNote && (
        <div className="empty-note mt-4 text-xs italic text-ink-soft">
          {emptyNote}
        </div>
      )}

      {/* Active AI Investigation Loader Banner */}
      {isInvestigating && (
        <InvestigationLoader
          query={investigatingQueryText}
          symbol={selectedSymbol}
          onCancel={() => setIsInvestigating(false)}
        />
      )}

      {/* Result Dossier */}
      <div id="dossier" className="mt-9 print-page">
        {/* Case Number, Date Controls & Actions */}
        <div className="flex justify-between items-center mb-4 flex-wrap gap-3 pb-3 border-b border-rule">
          <div className="case-no text-xs text-ink-soft tracking-wide flex items-center flex-wrap gap-2.5">
            <span className="font-semibold text-ink">
              Dossier No. {selectedSymbol === 'NIFTYBANK' ? '0416' : '0417'}
            </span>
            <span className="text-rule hidden sm:inline">|</span>
            <label className="flex items-center space-x-1.5 text-xs text-ink">
              <span className="text-ink-soft font-medium">Exact Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  queryClient.invalidateQueries({ queryKey: ['explanation'] });
                }}
                className="border border-rule px-2.5 py-1 bg-paper text-ink text-xs rounded-md focus:border-brass outline-none"
                title="Specify any exact date"
              />
            </label>
            {anomalies && anomalies.length > 0 && (
              <select
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  queryClient.invalidateQueries({ queryKey: ['explanation'] });
                }}
                className="border border-rule px-2.5 py-1 bg-paper text-ink text-xs rounded-md focus:border-brass outline-none cursor-pointer"
                title="Select a detected event date"
              >
                {anomalies.map((a) => (
                  <option key={a.date} value={a.date}>
                    Shock: {a.date} ({a.returnPct > 0 ? `+${a.returnPct.toFixed(2)}%` : `${a.returnPct.toFixed(2)}%`})
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex items-center space-x-2.5 text-xs non-printable">
            <button
              onClick={handleToggleWatchlist}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-all ${
                isInWatchlist ? 'border-brass text-brass bg-brass-soft font-semibold' : 'border-rule text-ink-soft hover:border-ink hover:text-ink bg-paper'
              }`}
            >
              <span>{isInWatchlist ? '★ In Watchlist' : '☆ Add to Watchlist'}</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 border border-rule rounded-md text-ink-soft hover:text-ink hover:border-ink bg-paper transition-all font-medium"
            >
              Export Dossier ⎘
            </button>
          </div>
        </div>

        {/* Headline Header */}
        <div className="headline flex justify-between items-baseline flex-wrap gap-4 pb-4">
          <div className="name-block">
            <h1 className="ticker font-serif text-4xl font-medium tracking-tight text-ink">
              {selectedSymbol}
            </h1>
            <div className="full-name text-xs text-ink-soft mt-1">
              {instrumentName}
            </div>
          </div>

          <div className="price-block text-right">
            <div className="price font-serif text-3xl font-medium tabular-nums text-ink">
              {currentPriceStr}
            </div>
            <div
              className={`change text-sm font-semibold tabular-nums change-draw ${
                returnPct === null
                  ? 'text-ink-soft'
                  : isGain
                  ? 'text-gain'
                  : 'text-loss'
              }`}
            >
              {returnPct !== null ? (isGain ? '▲ ' : '▼ ') : ''}{changeStr}
            </div>
          </div>
        </div>

        {/* Detected Anomaly Selector */}
        {anomalies && anomalies.length > 0 && (
          <div className="mb-4 pt-2 border-t border-rule flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="text-ink-soft">
              Detected Anomalies ({anomalies.length} recorded):
            </div>
            <div className="flex items-center space-x-2">
              <label htmlFor="anomaly-select" className="text-ink-soft font-mono">Date:</label>
              <select
                id="anomaly-select"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-paper-inset border border-rule text-ink px-2 py-1 text-xs outline-none"
              >
                {selectedDate && !anomalies.some((a: Anomaly) => a.date === selectedDate) && (
                  <option value={selectedDate}>
                    {selectedDate} — QUERIED WINDOW (Live FinBERT Analysis)
                  </option>
                )}
                {anomalies.map((a: Anomaly) => (
                  <option key={a.date} value={a.date}>
                    {a.date} — {a.direction.toUpperCase()} ({a.returnPct > 0 ? '+' : ''}{a.returnPct}%, z={a.returnZ}) {a.confidence === 'unconfirmed' ? '[Abstention]' : `[${a.confidence}]`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Price chart */}
        <ChartControls {...chartOpts} onChange={(patch) => setChartOpts((o) => ({ ...o, ...patch }))} />
        <CandleChart
          bars={aggregate((prices?.points || []).slice(-RANGE_DAYS[chartOpts.range]), chartOpts.interval)}
          type={chartOpts.type}
          showSma={chartOpts.sma}
          showVolume={chartOpts.volume}
          anomalyDates={(anomalies || []).map((a) => a.date)}
          selectedDate={selectedDate}
          onSelectAnomaly={setSelectedDate}
          label={`${selectedSymbol} ${chartOpts.type} chart, ${chartOpts.range}, ${chartOpts.interval} bars`}
        />

        {/* Signal Ledger: Three-Column Card */}
        <div className="ledger tv-card grid grid-cols-1 md:grid-cols-3 my-6 shadow-sm overflow-hidden">
          {/* Col 1: Price Regime */}
          <div className="ledger-col p-5 md:border-r border-b md:border-b-0 border-rule">
            <div className="col-label text-[11px] font-bold text-ink-soft mb-2 uppercase tracking-wider">
              <GlossaryTerm termKey="regime">Price Regime</GlossaryTerm>
            </div>
            <div
              className={`col-value text-2xl font-bold ${
                explanation?.priceDirection === 'bullish'
                  ? 'text-gain'
                  : explanation?.priceDirection === 'bearish'
                  ? 'text-loss'
                  : 'text-ink'
              }`}
            >
              {explanation?.priceDirection === 'bullish'
                ? '▲ Bullish'
                : explanation?.priceDirection === 'bearish'
                ? '▼ Bearish'
                : explanation?.priceDirection === 'consolidating'
                ? '● Consolidating'
                : explanation?.priceDirection === 'neutral'
                ? '● Neutral'
                : (explanation ? '● Neutral' : 'No Regime Data')}
            </div>
            <div className="col-sub text-xs text-ink-soft mt-1.5">
              <GlossaryTerm termKey="z-score">z-score</GlossaryTerm>{' '}
              <span className="font-mono font-medium">
                {explanation && explanation.returnZ !== undefined && explanation.returnZ !== null
                  ? typeof explanation.returnZ === 'number'
                    ? (explanation.returnZ > 0 ? `+${explanation.returnZ.toFixed(2)}` : `${explanation.returnZ.toFixed(2)}`)
                    : explanation.returnZ
                  : 'N/A'}
              </span>{' '}
              · 60-day baseline
            </div>
          </div>

          {/* Col 2: News Sentiment */}
          <div className="ledger-col p-5 md:border-r border-b md:border-b-0 border-rule">
            <div className="col-label text-[11px] font-bold text-ink-soft mb-2 uppercase tracking-wider">
              <GlossaryTerm termKey="sentiment">News Sentiment</GlossaryTerm>
            </div>
            <div className="col-value text-2xl font-bold text-ink">
              {explanation?.newsDirection
                ? explanation.newsDirection.replace(/_/g, ' ').toUpperCase()
                : 'NO NEWS AVAILABLE'}
            </div>
            <div className="col-sub text-xs text-ink-soft mt-1.5">
              {explanation?.newsDirection === 'no_news_available'
                ? 'No verified news articles found for date'
                : explanation?.newsDirection === 'retrieval_failed'
                ? 'Online news retrieval was unavailable'
                : explanation?.hasClearDriver
                ? 'Verified press drivers identified'
                : explanation
                ? 'No clear narrative in news'
                : 'No news data available'}
            </div>
          </div>

          {/* Col 3: Signal Agreement Meter */}
          <div className="ledger-col p-5">
            <div className="col-label text-[11px] font-bold text-ink-soft mb-2 uppercase tracking-wider">
              <GlossaryTerm termKey="signal agreement">Signal Agreement</GlossaryTerm>
            </div>
            <div className="flex items-center space-x-2">
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  explanation?.signalAgreement === 'aligned'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : explanation?.signalAgreement === 'diverging'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-paper-inset text-ink-soft border border-rule'
                }`}
              >
                {explanation?.signalAgreement
                  ? explanation.signalAgreement.charAt(0).toUpperCase() + explanation.signalAgreement.slice(1)
                  : 'Insufficient'}
              </span>
            </div>
            {/* Agreement Meter Bar */}
            <div className="meter mt-3 h-2 bg-rule/50 rounded-full overflow-hidden">
              <div
                className="meter-fill-anim h-full bg-brass rounded-full"
                style={{
                  '--meter-target':
                    explanation?.signalAgreement === 'aligned'
                      ? '85%'
                      : explanation?.signalAgreement === 'diverging'
                      ? '35%'
                      : explanation?.signalAgreement === 'insufficient'
                      ? '15%'
                      : '0%',
                } as React.CSSProperties}
              />
            </div>
            <div className="col-sub text-xs text-ink-soft mt-1.5">
              {explanation?.signalAgreement === 'aligned'
                ? 'Price momentum and news tone confirm each other'
                : explanation?.signalAgreement === 'diverging'
                ? 'Price action diverges from prevailing news tone'
                : 'Insufficient evidence to form consensus'}
            </div>
          </div>
        </div>

        {/* Explanation Section */}
        {loadingExplanation ? (
          <InvestigationLoader
            query={investigatingQueryText || `Investigating ${selectedSymbol} (${selectedDate || 'Selected Window'})`}
            symbol={selectedSymbol}
          />
        ) : explanation ? (
          <div id="explanation-section" className="explanation-section tv-card p-6 my-6 shadow-sm">
            <div className="explain-head flex justify-between items-baseline mb-4 pb-3 border-b border-rule flex-wrap gap-2">
              <h2 className="text-xl font-bold text-ink">
                {explanation.hasClearDriver ? 'Causal Analysis' : 'Engine Finding: Insufficient Driver'}
              </h2>
              <div className="confidence text-xs text-ink-soft flex items-center gap-2 flex-wrap">
                {explanation.validationStatus && (
                  <span
                    className={`font-mono px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                      explanation.validationStatus === 'VALID'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : explanation.validationStatus === 'PARTIALLY_VALID'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-paper-inset text-ink-soft border border-rule'
                    }`}
                  >
                    Evidence: {explanation.validationStatus.replace(/_/g, ' ')}
                  </span>
                )}
                <span>
                  <GlossaryTerm termKey="confidence">Confidence</GlossaryTerm>: <b className="text-ink uppercase">{explanation.confidence}</b>
                </span>
                {explanation.causalCategory && (
                  <span className="font-mono text-brass font-semibold">
                    [<GlossaryTerm termKey="causal category">{explanation.causalCategory}</GlossaryTerm>]
                  </span>
                )}
              </div>
            </div>

            {/* Distinct First-Class Abstention State */}
            {!explanation.hasClearDriver ? (
              <div className="abstention-box border border-rule bg-paper-inset p-5 my-4 rounded-md">
                <div className="flex items-start space-x-3">
                  <div className="text-brass text-lg font-bold">§</div>
                  <div>
                    <h3 className="text-base font-bold text-ink mb-1">
                      Honest Abstention — No Confirmed Driver
                    </h3>
                    <p className="text-sm text-ink leading-relaxed">
                      {explanation.causeSummary}
                    </p>
                    <p className="text-xs text-ink-soft mt-3 italic">
                      MarketMind declines to generate speculative causes when verifiable news citations are absent. This move is categorized as an <GlossaryTerm termKey="abstention">abstention</GlossaryTerm>.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Confirmed Explanation State */
              <div className="explain-body text-[14.5px] text-ink leading-relaxed whitespace-pre-line space-y-3">
                <p>
                  {explanation.causeSummary}
                  {explanation.citations && explanation.citations.map((c) => (
                    <sup key={c.n} className="text-brass font-bold ml-0.5">{c.n}</sup>
                  ))}
                </p>

                {/* Footnotes */}
                {explanation.citations && explanation.citations.length > 0 && (
                  <div className="footnotes mt-5 pt-3.5 border-t border-dashed border-rule">
                    {explanation.citations.map((c) => (
                      <div key={c.n} className="footnote flex gap-2.5 text-xs text-ink-soft mb-2">
                        <span className="fn-num text-brass font-bold min-w-[14px]">{c.n}.</span>
                        <div>
                          <span className="font-medium text-ink">{c.source}</span> — "{c.title}"
                          {c.publishedDate && <span className="ml-1 text-ink-soft">· {c.publishedDate}</span>}
                          {c.url && (
                            <a
                              href={c.url}
                              target="_blank"
                              rel="noreferrer"
                              className="ml-2 text-ink-soft hover:text-ink underline"
                            >
                              [source]
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Collapsible Explainability Trail */}
            <div className="mt-4 pt-3 border-t border-rule text-xs">
              <button
                type="button"
                onClick={() => setShowSourcesTrail(!showSourcesTrail)}
                className="text-ink-soft hover:text-ink underline cursor-pointer"
              >
                {showSourcesTrail ? '▾ Hide retrieved source trail' : '▸ Inspect retrieved source trail and metadata'}
              </button>

              {showSourcesTrail && (
                <div className="mt-3 p-3 bg-paper-inset border border-rule space-y-2 text-xs">
                  <div><b>Scope:</b> {explanation.scope || 'unclear'}</div>
                  <div><b><GlossaryTerm termKey="causal category">Causal Category</GlossaryTerm>:</b> {explanation.causalCategory}</div>
                  <div><b><GlossaryTerm termKey="signal agreement">Signal Agreement</GlossaryTerm>:</b> {explanation.signalAgreement}</div>
                  <div><b>Retrieved Sources:</b> {explanation.citations?.length || 0} citations indexed</div>
                </div>
              )}
            </div>

            {/* User Feedback Widget */}
            <div className="feedback-widget mt-6 pt-3 border-t border-rule flex items-center justify-between text-xs text-ink-soft">
              <span>Was this explanation helpful for your research?</span>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => handleFeedback(true)}
                  disabled={feedbackGiven !== null}
                  className={`px-2.5 py-1 border transition-colors ${
                    feedbackGiven === 'helpful'
                      ? 'border-gain text-gain bg-paper-inset'
                      : 'border-rule hover:border-ink'
                  }`}
                >
                  ✓ Helpful
                </button>
                <button
                  type="button"
                  onClick={() => handleFeedback(false)}
                  disabled={feedbackGiven !== null}
                  className={`px-2.5 py-1 border transition-colors ${
                    feedbackGiven === 'unhelpful'
                      ? 'border-loss text-loss bg-paper-inset'
                      : 'border-rule hover:border-ink'
                  }`}
                >
                  ✕ Unhelpful
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="tv-card p-8 text-center text-ink-soft my-6 shadow-sm border border-dashed border-rule rounded-2xl bg-paper-inset/40">
            <div className="font-serif text-base font-semibold text-ink mb-1.5">
              No Recorded Causal Dossier for {selectedSymbol} ({selectedDate || 'Selected Window'})
            </div>
            <p className="text-xs text-ink-soft max-w-lg mx-auto leading-relaxed">
              MarketMind strictly enforces zero fake data: narrative explanations and signal agreement are generated exclusively for our tracked USP instruments (<b>SBI</b>, <b>TCS</b>, <b>HDFC Bank</b>, and <b>NIFTY</b>). Real-time price tracking and technical charts remain available for all Indian equities in your Watchlist.
            </p>
          </div>
        )}

        {/* Similar Historical Instances Table */}
        <div className="section-label text-[11px] text-ink-soft mt-9 mb-3">— Similar Historical Instances</div>
        {(() => {
          const recordedAnomalies = (anomalies || []).filter((a) => a.date !== selectedDate);
          if (recordedAnomalies.length === 0) {
            return (
              <div className="p-4 rounded-xl border border-rule bg-paper-inset text-xs text-ink-soft italic">
                No similar historical instances or recorded anomalies found for {selectedSymbol} in the observed window.
              </div>
            );
          }
          return (
            <table className="instances w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-ink">
                  <th className="text-left font-semibold text-ink-soft py-2 pr-3">Date Window</th>
                  <th className="text-left font-semibold text-ink-soft py-2 pr-3">Pattern Match</th>
                  <th className="text-left font-semibold text-ink-soft py-2 pr-3">Historical Move</th>
                  <th className="text-left font-semibold text-ink-soft py-2">Direction</th>
                </tr>
              </thead>
              <tbody>
                {recordedAnomalies.slice(0, 5).map((a) => {
                  const isBullish = a.direction === 'bullish' || a.returnPct >= 0;
                  return (
                    <tr
                      key={a.date}
                      onClick={() => {
                        setSelectedDate(a.date);
                        queryClient.invalidateQueries({ queryKey: ['explanation'] });
                      }}
                      className="border-b border-rule hover:bg-paper-inset/60 cursor-pointer transition-colors"
                      title="Click to inspect this historical instance"
                    >
                      <td className="py-2.5 pr-3 font-mono font-medium">{a.date}</td>
                      <td className="py-2.5 pr-3">{a.label || 'Market Dislocation'}</td>
                      <td className={`py-2.5 pr-3 font-mono font-semibold ${isBullish ? 'text-gain' : 'text-loss'}`}>
                        {a.returnPct > 0 ? `+${a.returnPct.toFixed(2)}%` : `${a.returnPct.toFixed(2)}%`} (z: {a.returnZ.toFixed(2)})
                      </td>
                      <td className={`py-2.5 font-semibold ${isBullish ? 'text-gain' : 'text-loss'}`}>
                        {isBullish ? 'Bullish' : 'Bearish'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          );
        })()}

        {/* Verbatim Disclaimer Footer */}
        <footer className="mt-12 pt-4 border-t border-rule text-xs text-ink-soft leading-relaxed">
          MarketMind is a research and explanation tool built on historical price and news data. It does not predict future prices and is not investment advice. Explanations are generated from retrieved sources and may be incomplete.
        </footer>
      </div>
    </div>
  );
};
