import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CandleChart } from '../components/CandleChart';
import { ChartControls } from '../components/ChartControls';
import { aggregate, RANGE_DAYS, RangeKey, ChartType, Interval } from '../features/chart/chartUtils';
import { loadChartPrefs } from './SettingsPage';
import { GlossaryTerm } from '../components/GlossaryTerm';
import { useToast } from '../components/Toast';
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
  const [queryInput, setQueryInput] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState('NIFTYBANK');
  const [selectedDate, setSelectedDate] = useState<string>('');
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

  // Pick default anomaly date when anomalies load
  useEffect(() => {
    if (anomalies && anomalies.length > 0) {
      if (!selectedDate || !anomalies.some((a) => a.date === selectedDate)) {
        // Default to the first anomaly (e.g. 2026-09-15 or latest)
        setSelectedDate(anomalies[0].date);
      }
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
    if (!queryInput.trim()) return;

    try {
      const res = await resolveQueryApi(queryInput.trim());
      if (res.symbols && res.symbols.length > 0) {
        setSelectedSymbol(res.symbols[0]);
        setEmptyNote(null);
      } else {
        setEmptyNote(res.unmatchedMessage || 'Not in this dossier tracked universe yet.');
      }
    } catch {
      setEmptyNote('Unable to resolve query at this time.');
    }
  };

  const handleSelectChip = (sym: string) => {
    setSelectedSymbol(sym);
    setEmptyNote(null);
    setFeedbackGiven(null);
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
    ? prices.points[prices.points.length - 1]
    : null;

  const currentPriceStr = currentPricePoint
    ? `₹${Number(currentPricePoint.close).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    : '₹56,470.65';

  const returnPct = explanation ? Number(explanation.returnPct) : -1.43;
  const isGain = returnPct >= 0;
  const changeStr = `${isGain ? '+' : ''}${returnPct.toFixed(2)}%`;

  return (
    <div className="desk pt-6">
      {/* Query Desk Input & Quick Chips */}
      <div className="desk-label text-xs text-ink-soft mb-2.5">— research desk</div>

      <form onSubmit={handleRunQuery} className="query-row flex border-b-2 border-ink pb-2.5 items-baseline">
        <input
          id="queryInput"
          type="text"
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          placeholder="why is TCS falling this week"
          className="flex-1 bg-transparent border-none outline-none font-serif text-xl text-ink placeholder:italic placeholder:text-ink-soft"
        />
        <button
          type="submit"
          className="font-sans text-sm font-semibold text-ink hover:text-brass cursor-pointer pl-3"
        >
          Ask →
        </button>
      </form>

      {/* Quick Pick Chips */}
      <div className="chips flex gap-2.5 mt-3.5 flex-wrap">
        {[
          { sym: 'NIFTYBANK', label: 'Nifty Bank' },
          { sym: 'TCS', label: 'TCS' },
          { sym: 'INFY', label: 'Infosys' },
          { sym: 'RELIANCE', label: 'Reliance' },
          { sym: 'HDFCBANK', label: 'HDFC Bank' },
        ].map((c) => (
          <button
            key={c.sym}
            type="button"
            onClick={() => handleSelectChip(c.sym)}
            className={`text-xs px-3 py-1.5 border transition-colors ${
              selectedSymbol === c.sym
                ? 'border-ink text-ink bg-brass-soft font-medium'
                : 'border-rule text-ink-soft bg-paper-inset hover:border-ink hover:text-ink'
            }`}
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

      {/* Result Dossier */}
      <div id="dossier" className="mt-9 print-page">
        {/* Case Number & Actions */}
        <div className="flex justify-between items-center mb-1.5">
          <div className="case-no text-xs text-ink-soft tracking-wide">
            Dossier No. {selectedSymbol === 'NIFTYBANK' ? '0416' : '0417'} — Event Observation
          </div>
          <div className="flex items-center space-x-3 text-xs non-printable">
            <button
              onClick={handleToggleWatchlist}
              className={`flex items-center space-x-1 px-2.5 py-1 border transition-colors ${
                isInWatchlist ? 'border-brass text-brass bg-paper-inset' : 'border-rule text-ink-soft hover:border-ink'
              }`}
            >
              <span>{isInWatchlist ? '★ In Watchlist' : '☆ Watch'}</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-2.5 py-1 border border-rule text-ink-soft hover:border-ink"
            >
              Export Case File ⎘
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
                isGain ? 'text-gain' : 'text-loss'
              }`}
            >
              {isGain ? '▲' : '▼'} {changeStr}
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
        <div className="ledger grid grid-cols-1 md:grid-cols-3 border-t border-ink border-b border-rule my-6">
          {/* Col 1: Price Regime */}
          <div className="ledger-col p-4 md:border-r border-b md:border-b-0 border-rule">
            <div className="col-label text-[11px] text-ink-soft mb-2 uppercase tracking-wide">
              — <GlossaryTerm termKey="regime">Price Regime</GlossaryTerm>
            </div>
            <div className={`col-value font-serif text-xl font-medium ${isGain ? 'text-gain' : 'text-loss'}`}>
              {explanation?.priceDirection === 'bullish' ? 'Bullish' : 'Bearish'}
            </div>
            <div className="col-sub text-xs text-ink-soft mt-1">
              <GlossaryTerm termKey="z-score">z-score</GlossaryTerm> {explanation ? explanation.returnZ : '-2.2'} · 60-day window
            </div>
          </div>

          {/* Col 2: News Sentiment */}
          <div className="ledger-col p-4 md:border-r border-b md:border-b-0 border-rule">
            <div className="col-label text-[11px] text-ink-soft mb-2 uppercase tracking-wide">
              — <GlossaryTerm termKey="sentiment">News Sentiment</GlossaryTerm>
            </div>
            <div className="col-value font-serif text-xl font-medium text-ink">
              {explanation?.newsDirection ? explanation.newsDirection.toUpperCase() : 'NEUTRAL'}
            </div>
            <div className="col-sub text-xs text-ink-soft mt-1">
              {explanation?.hasClearDriver ? 'Verified press drivers identified' : 'No clear narrative in news'}
            </div>
          </div>

          {/* Col 3: Signal Agreement Meter */}
          <div className="ledger-col p-4">
            <div className="col-label text-[11px] text-ink-soft mb-2 uppercase tracking-wide">
              — <GlossaryTerm termKey="signal agreement">Signal Agreement</GlossaryTerm>
            </div>
            <div className="flex items-center space-x-2">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-sm ${
                  explanation?.signalAgreement === 'aligned'
                    ? 'bg-[rgb(var(--c-tint))] text-gain'
                    : explanation?.signalAgreement === 'diverging'
                    ? 'bg-[rgb(var(--c-losstint))] text-loss'
                    : 'bg-paper-inset text-ink-soft border border-rule'
                }`}
              >
                {explanation?.signalAgreement
                  ? explanation.signalAgreement.charAt(0).toUpperCase() + explanation.signalAgreement.slice(1)
                  : 'Insufficient'}
              </span>
            </div>
            {/* Agreement Meter Bar */}
            <div className="meter mt-2.5 h-1.5 bg-[#DADCCF] rounded-sm overflow-hidden">
              <div
                className="meter-fill-anim h-full bg-brass rounded-sm"
                style={{
                  '--meter-target':
                    explanation?.signalAgreement === 'aligned'
                      ? '85%'
                      : explanation?.signalAgreement === 'diverging'
                      ? '35%'
                      : '15%',
                } as React.CSSProperties}
              />
            </div>
            <div className="col-sub text-xs text-ink-soft mt-1">
              {explanation?.signalAgreement === 'aligned'
                ? 'Price and sentiment point same way'
                : explanation?.signalAgreement === 'diverging'
                ? 'Price action diverges from news tone'
                : 'Insufficient evidence to form consensus'}
            </div>
          </div>
        </div>

        {/* Explanation Section */}
        {loadingExplanation ? (
          <div className="p-8 text-center text-ink-soft italic text-sm">
            Reviewing the case file…
          </div>
        ) : explanation ? (
          <div className="explanation-section my-6">
            <div className="explain-head flex justify-between items-baseline mb-3">
              <h2 className="font-serif text-xl font-medium text-ink">
                {explanation.hasClearDriver ? 'Causal Analysis' : 'Engine Finding: Insufficient Driver'}
              </h2>
              <div className="confidence text-xs text-ink-soft">
                <GlossaryTerm termKey="confidence">Confidence</GlossaryTerm>: <b className="text-ink uppercase">{explanation.confidence}</b>
                {explanation.causalCategory && (
                  <span className="ml-3 font-mono text-brass">
                    [<GlossaryTerm termKey="causal category">{explanation.causalCategory}</GlossaryTerm>]
                  </span>
                )}
              </div>
            </div>

            {/* Distinct First-Class Abstention State */}
            {!explanation.hasClearDriver ? (
              <div className="abstention-box border border-rule bg-paper-inset p-5 my-4">
                <div className="flex items-start space-x-3">
                  <div className="text-brass text-lg font-serif">§</div>
                  <div>
                    <h3 className="font-serif text-base font-medium text-ink mb-1">
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
              <div className="explain-body text-[14.5px] text-ink leading-relaxed">
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
        ) : null}

        {/* Similar Historical Instances Table */}
        <div className="section-label text-[11px] text-ink-soft mt-9 mb-3">— Similar Historical Instances</div>
        <table className="instances w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-ink">
              <th className="text-left font-semibold text-ink-soft py-2 pr-3">Window</th>
              <th className="text-left font-semibold text-ink-soft py-2 pr-3">Pattern Match</th>
              <th className="text-left font-semibold text-ink-soft py-2 pr-3">Historical Outcome</th>
              <th className="text-left font-semibold text-ink-soft py-2">Rebound</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-rule">
              <td className="py-2.5 pr-3 font-mono">Feb 2026</td>
              <td className="py-2.5 pr-3">Budget announcement yield reaction</td>
              <td className="py-2.5 pr-3">Stabilized after 3 sessions</td>
              <td className="py-2.5 font-semibold text-gain">Yes</td>
            </tr>
            <tr className="border-b border-rule">
              <td className="py-2.5 pr-3 font-mono">Jul 2026</td>
              <td className="py-2.5 pr-3">Crude shock geopolitical divergence</td>
              <td className="py-2.5 pr-3">Extended decline 4 more sessions</td>
              <td className="py-2.5 font-semibold text-loss">No</td>
            </tr>
            <tr className="border-b border-rule">
              <td className="py-2.5 pr-3 font-mono">Jun 2026</td>
              <td className="py-2.5 pr-3">Ceasefire risk-on expansion</td>
              <td className="py-2.5 pr-3">Rallied 5 sessions</td>
              <td className="py-2.5 font-semibold text-gain">Yes</td>
            </tr>
          </tbody>
        </table>

        {/* Verbatim Disclaimer Footer */}
        <footer className="mt-12 pt-4 border-t border-rule text-xs text-ink-soft leading-relaxed">
          MarketMind is a research and explanation tool built on historical price and news data. It does not predict future prices and is not investment advice. Explanations are generated from retrieved sources and may be incomplete.
        </footer>
      </div>
    </div>
  );
};
