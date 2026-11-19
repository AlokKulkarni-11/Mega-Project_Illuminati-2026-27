import React, { useState } from 'react';
import {
  calculateSip,
  calculateStepUpSip,
  calculateLumpsum,
  calculateGoalPlanner,
  CalculatorResult,
} from '../features/calculators/formulas';

type CalculatorTab = 'sip' | 'stepup' | 'lumpsum' | 'goal';

export const CalculatorsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CalculatorTab>('sip');

  // SIP State
  const [sipMonthly, setSipMonthly] = useState(10000);
  const [sipRate, setSipRate] = useState(12);
  const [sipYears, setSipYears] = useState(10);

  // Step-up SIP State
  const [stepUpMonthly, setStepUpMonthly] = useState(10000);
  const [stepUpPct, setStepUpPct] = useState(10);
  const [stepUpRate, setStepUpRate] = useState(12);
  const [stepUpYears, setStepUpYears] = useState(10);

  // Lumpsum State
  const [lumpsumPrincipal, setLumpsumPrincipal] = useState(100000);
  const [lumpsumRate, setLumpsumRate] = useState(12);
  const [lumpsumYears, setLumpsumYears] = useState(10);

  // Goal Planner State
  const [goalTarget, setGoalTarget] = useState(2500000);
  const [goalInflation, setGoalInflation] = useState(6);
  const [goalReturn, setGoalReturn] = useState(12);
  const [goalYears, setGoalYears] = useState(10);

  // Computations
  const sipResult = calculateSip(sipMonthly, sipRate, sipYears);
  const stepUpResult = calculateStepUpSip(stepUpMonthly, stepUpPct, stepUpRate, stepUpYears);
  const lumpsumResult = calculateLumpsum(lumpsumPrincipal, lumpsumRate, lumpsumYears);
  const goalResult = calculateGoalPlanner(goalTarget, goalInflation, goalReturn, goalYears);

  const formatCurrency = (val: number) =>
    `₹${Math.round(val).toLocaleString('en-IN')}`;

  const renderTwoSegmentBar = (res: CalculatorResult) => {
    const total = res.totalValue || 1;
    const investedPct = Math.min(100, Math.max(0, (res.invested / total) * 100));
    const returnsPct = Math.max(0, 100 - investedPct);
    const multiplier = res.invested > 0 ? (res.totalValue / res.invested).toFixed(1) : '1.0';

    return (
      <div className="my-6">
        {/* Wealth Breakdown Header */}
        <div className="flex items-center justify-between text-xs font-bold mb-2.5">
          <span className="text-slate-700 dark:text-slate-300">Capital Allocation vs Wealth Creation</span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-700">
            {multiplier}x Wealth Multiplier
          </span>
        </div>

        {/* Dual Segment Progress Bar */}
        <div className="h-4 tab-track rounded-full overflow-hidden flex border p-0.5 shadow-inner">
          <div
            style={{ width: `${investedPct}%` }}
            className="bg-slate-700 dark:bg-slate-400 h-full rounded-l-full transition-all duration-300"
            title={`Invested: ${formatCurrency(res.invested)} (${investedPct.toFixed(1)}%)`}
          />
          <div
            style={{ width: `${returnsPct}%` }}
            className="bg-emerald-500 dark:bg-emerald-400 h-full rounded-r-full transition-all duration-300"
            title={`Wealth Gain: ${formatCurrency(res.returns)} (${returnsPct.toFixed(1)}%)`}
          />
        </div>

        {/* Legend */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between p-2 rounded-xl calc-card border">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700 dark:bg-slate-400 shrink-0" />
              <span className="page-subheading font-medium">Invested Capital ({investedPct.toFixed(0)}%)</span>
            </div>
            <b className="page-heading font-bold tabular-nums">{formatCurrency(res.invested)}</b>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0" />
              <span className="text-emerald-800 dark:text-emerald-300 font-medium">Estimated Gain ({returnsPct.toFixed(0)}%)</span>
            </div>
            <b className="text-emerald-700 dark:text-emerald-300 font-bold tabular-nums">+{formatCurrency(res.returns)}</b>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="calculators-page pt-6 pb-16 max-w-desk mx-auto">
      {/* Header (Clean, Zero "Client-Side Math" badge) */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5 mb-8">
        <div className="inline-flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800 px-3 py-1 rounded-full mb-2">
          <span>Financial Projection Models</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight page-heading">
          Investment Desks & Calculators
        </h1>
        <p className="text-sm page-subheading mt-1">
          Precision compounding models for disciplined long-term capital allocation
        </p>
      </div>

      {/* Segmented Pill Tabs */}
      <div className="tab-track p-1.5 rounded-2xl border flex flex-wrap gap-1.5 mb-8">
        {[
          {
            id: 'sip',
            label: 'Systematic Investment (SIP)',
            icon: (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ),
          },
          {
            id: 'stepup',
            label: 'Step-Up SIP',
            icon: (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            ),
          },
          {
            id: 'lumpsum',
            label: 'Lumpsum Growth',
            icon: (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
          },
          {
            id: 'goal',
            label: 'Reverse Goal Planner',
            icon: (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
          },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as CalculatorTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                active ? 'tab-pill-active' : 'tab-pill-inactive border-transparent'
              }`}
            >
              <span className={active ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Regular SIP */}
      {activeTab === 'sip' && (
        <div className="space-y-6">
          <p className="text-xs page-subheading font-medium">
            Calculate the compound terminal value of periodic monthly equity contributions over your investment horizon.
          </p>

          {/* Input Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 rounded-2xl calc-card border shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold page-subheading uppercase tracking-wider">
                  Monthly SIP
                </label>
                <span className="text-xs font-bold font-mono text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                  {formatCurrency(sipMonthly)}
                </span>
              </div>
              <input
                type="range"
                min="1000"
                max="200000"
                step="1000"
                value={sipMonthly}
                onChange={(e) => setSipMonthly(Number(e.target.value))}
                className="w-full accent-amber-500 mb-3 cursor-pointer"
              />
              <div className="flex gap-1.5 flex-wrap">
                {[5000, 10000, 25000, 50000].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setSipMonthly(v)}
                    className="preset-btn text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer"
                  >
                    ₹{v / 1000}k
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-2xl calc-card border shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold page-subheading uppercase tracking-wider">
                  Expected Return
                </label>
                <span className="text-xs font-bold font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                  {sipRate}% p.a.
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="25"
                step="0.5"
                value={sipRate}
                onChange={(e) => setSipRate(Number(e.target.value))}
                className="w-full accent-emerald-500 mb-3 cursor-pointer"
              />
              <div className="flex gap-1.5 flex-wrap">
                {[10, 12, 14, 16].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSipRate(r)}
                    className="preset-btn text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer"
                  >
                    {r}%
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-2xl calc-card border shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold page-subheading uppercase tracking-wider">
                  Time Horizon
                </label>
                <span className="text-xs font-bold font-mono page-heading tab-track px-2 py-0.5 rounded-md">
                  {sipYears} Years
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="35"
                step="1"
                value={sipYears}
                onChange={(e) => setSipYears(Number(e.target.value))}
                className="w-full accent-slate-700 dark:accent-slate-400 mb-3 cursor-pointer"
              />
              <div className="flex gap-1.5 flex-wrap">
                {[5, 10, 15, 20].map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setSipYears(y)}
                    className="preset-btn text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer"
                  >
                    {y}Y
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Bento Card */}
          <div className="p-7 rounded-3xl calc-card border shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-200/80 dark:border-amber-800">
              PROJECTED TERMINAL WEALTH
            </span>
            <div className="text-4xl sm:text-5xl font-black metric-display my-3 tabular-nums tracking-tight">
              {formatCurrency(sipResult.totalValue)}
            </div>
            {renderTwoSegmentBar(sipResult)}
          </div>
        </div>
      )}

      {/* TAB 2: Step-up SIP */}
      {activeTab === 'stepup' && (
        <div className="space-y-6">
          <p className="text-xs page-subheading font-medium">
            Model the accelerated compounding achieved when monthly SIP installments increase annually with your income growth.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-5 rounded-2xl calc-card border shadow-xs">
              <label className="block text-xs font-bold page-subheading uppercase tracking-wider mb-2">
                Initial Monthly (₹)
              </label>
              <input
                type="number"
                value={stepUpMonthly}
                onChange={(e) => setStepUpMonthly(Number(e.target.value))}
                className="w-full calc-input-box rounded-xl px-3.5 py-2 font-bold text-base outline-none focus:border-amber-500"
              />
            </div>

            <div className="p-5 rounded-2xl calc-card border shadow-xs">
              <label className="block text-xs font-bold page-subheading uppercase tracking-wider mb-2">
                Annual Step-Up (%)
              </label>
              <input
                type="number"
                value={stepUpPct}
                onChange={(e) => setStepUpPct(Number(e.target.value))}
                className="w-full calc-input-box rounded-xl px-3.5 py-2 font-bold text-base outline-none focus:border-amber-500"
              />
            </div>

            <div className="p-5 rounded-2xl calc-card border shadow-xs">
              <label className="block text-xs font-bold page-subheading uppercase tracking-wider mb-2">
                Expected Return (% p.a.)
              </label>
              <input
                type="number"
                step="0.5"
                value={stepUpRate}
                onChange={(e) => setStepUpRate(Number(e.target.value))}
                className="w-full calc-input-box rounded-xl px-3.5 py-2 font-bold text-base outline-none focus:border-amber-500"
              />
            </div>

            <div className="p-5 rounded-2xl calc-card border shadow-xs">
              <label className="block text-xs font-bold page-subheading uppercase tracking-wider mb-2">
                Horizon (Years)
              </label>
              <input
                type="number"
                value={stepUpYears}
                onChange={(e) => setStepUpYears(Number(e.target.value))}
                className="w-full calc-input-box rounded-xl px-3.5 py-2 font-bold text-base outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="p-7 rounded-3xl calc-card border shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-200/80 dark:border-amber-800">
              STEP-UP COMPOUND TERMINAL WEALTH
            </span>
            <div className="text-4xl sm:text-5xl font-black metric-display my-3 tabular-nums tracking-tight">
              {formatCurrency(stepUpResult.totalValue)}
            </div>
            {renderTwoSegmentBar(stepUpResult)}
          </div>
        </div>
      )}

      {/* TAB 3: Lumpsum */}
      {activeTab === 'lumpsum' && (
        <div className="space-y-6">
          <p className="text-xs page-subheading font-medium">
            Project the compound terminal growth of a single capital commitment over time.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 rounded-2xl calc-card border shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold page-subheading uppercase tracking-wider">
                  Lumpsum Investment
                </label>
                <span className="text-xs font-bold font-mono text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                  {formatCurrency(lumpsumPrincipal)}
                </span>
              </div>
              <input
                type="range"
                min="10000"
                max="10000000"
                step="10000"
                value={lumpsumPrincipal}
                onChange={(e) => setLumpsumPrincipal(Number(e.target.value))}
                className="w-full accent-amber-500 mb-3 cursor-pointer"
              />
              <div className="flex gap-1.5 flex-wrap">
                {[50000, 100000, 500000, 1000000].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setLumpsumPrincipal(v)}
                    className="preset-btn text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer"
                  >
                    ₹{v >= 100000 ? `${v / 100000}L` : `${v / 1000}k`}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-2xl calc-card border shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold page-subheading uppercase tracking-wider">
                  Expected Return
                </label>
                <span className="text-xs font-bold font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                  {lumpsumRate}% p.a.
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="25"
                step="0.5"
                value={lumpsumRate}
                onChange={(e) => setLumpsumRate(Number(e.target.value))}
                className="w-full accent-emerald-500 mb-3 cursor-pointer"
              />
              <div className="flex gap-1.5 flex-wrap">
                {[8, 10, 12, 15].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setLumpsumRate(r)}
                    className="preset-btn text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer"
                  >
                    {r}%
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-2xl calc-card border shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold page-subheading uppercase tracking-wider">
                  Horizon (Years)
                </label>
                <span className="text-xs font-bold font-mono page-heading tab-track px-2 py-0.5 rounded-md">
                  {lumpsumYears} Years
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                step="1"
                value={lumpsumYears}
                onChange={(e) => setLumpsumYears(Number(e.target.value))}
                className="w-full accent-slate-700 dark:accent-slate-400 mb-3 cursor-pointer"
              />
              <div className="flex gap-1.5 flex-wrap">
                {[3, 5, 10, 15].map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setLumpsumYears(y)}
                    className="preset-btn text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer"
                  >
                    {y}Y
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-7 rounded-3xl calc-card border shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-200/80 dark:border-amber-800">
              COMPOUND LUMPSUM TERMINAL VALUE
            </span>
            <div className="text-4xl sm:text-5xl font-black metric-display my-3 tabular-nums tracking-tight">
              {formatCurrency(lumpsumResult.totalValue)}
            </div>
            {renderTwoSegmentBar(lumpsumResult)}
          </div>
        </div>
      )}

      {/* TAB 4: Reverse Goal Planner */}
      {activeTab === 'goal' && (
        <div className="space-y-6">
          <p className="text-xs page-subheading font-medium">
            Calculate the exact monthly SIP required today to achieve a future financial target, fully adjusted forward for expected inflation.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-5 rounded-2xl calc-card border shadow-xs">
              <label className="block text-xs font-bold page-subheading uppercase tracking-wider mb-2">
                Target in Today's Money (₹)
              </label>
              <input
                type="number"
                value={goalTarget}
                onChange={(e) => setGoalTarget(Number(e.target.value))}
                className="w-full calc-input-box rounded-xl px-3.5 py-2 font-bold text-base outline-none focus:border-emerald-500"
              />
            </div>

            <div className="p-5 rounded-2xl calc-card border shadow-xs">
              <label className="block text-xs font-bold page-subheading uppercase tracking-wider mb-2">
                Annual Inflation (%)
              </label>
              <input
                type="number"
                step="0.5"
                value={goalInflation}
                onChange={(e) => setGoalInflation(Number(e.target.value))}
                className="w-full calc-input-box rounded-xl px-3.5 py-2 font-bold text-base outline-none focus:border-emerald-500"
              />
            </div>

            <div className="p-5 rounded-2xl calc-card border shadow-xs">
              <label className="block text-xs font-bold page-subheading uppercase tracking-wider mb-2">
                Expected Return (% p.a.)
              </label>
              <input
                type="number"
                step="0.5"
                value={goalReturn}
                onChange={(e) => setGoalReturn(Number(e.target.value))}
                className="w-full calc-input-box rounded-xl px-3.5 py-2 font-bold text-base outline-none focus:border-emerald-500"
              />
            </div>

            <div className="p-5 rounded-2xl calc-card border shadow-xs">
              <label className="block text-xs font-bold page-subheading uppercase tracking-wider mb-2">
                Years to Goal
              </label>
              <input
                type="number"
                value={goalYears}
                onChange={(e) => setGoalYears(Number(e.target.value))}
                className="w-full calc-input-box rounded-xl px-3.5 py-2 font-bold text-base outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="p-7 rounded-3xl calc-card border shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
              REQUIRED MONTHLY ALLOCATION
            </span>
            <div className="text-4xl sm:text-5xl font-black text-emerald-600 dark:text-emerald-400 my-3 tabular-nums tracking-tight">
              {formatCurrency(goalResult.requiredMonthlySip)} <span className="text-xl sm:text-2xl font-bold page-subheading">/ month</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 text-xs">
              <div className="p-3.5 rounded-xl calc-card border">
                <span className="page-subheading text-[10px] font-bold uppercase block mb-1">
                  Inflated Target at Horizon
                </span>
                <span className="text-base font-bold page-heading tabular-nums">
                  {formatCurrency(goalResult.inflatedTarget)}
                </span>
              </div>

              <div className="p-3.5 rounded-xl calc-card border">
                <span className="page-subheading text-[10px] font-bold uppercase block mb-1">
                  Total Capital Contributed
                </span>
                <span className="text-base font-bold page-heading tabular-nums">
                  {formatCurrency(goalResult.totalInvested)}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <span className="text-emerald-800 dark:text-emerald-400 text-[10px] font-bold uppercase block mb-1">
                  Compound Wealth Gained
                </span>
                <span className="text-base font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                  +{formatCurrency(goalResult.wealthGained)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Illustrative Disclaimer Note */}
      <div className="p-4 rounded-2xl calc-card border text-xs page-subheading text-center mt-8">
        <b className="page-heading">Institutional Disclaimer:</b> Computations above are strictly mathematical projections based on compounding formulas and historical equity assumptions. They do not constitute financial advice.
      </div>
    </div>
  );
};
