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
    `₹${Number(val).toLocaleString('en-IN')}`;

  const renderTwoSegmentBar = (res: CalculatorResult) => {
    const total = res.totalValue || 1;
    const investedPct = Math.min(100, Math.max(0, (res.invested / total) * 100));
    const returnsPct = Math.max(0, 100 - investedPct);

    return (
      <div className="my-6">
        <div className="h-4 bg-[#DADCCF] rounded-none overflow-hidden flex border border-rule">
          <div
            style={{ width: `${investedPct}%` }}
            className="bg-ink h-full transition-all duration-300"
            title={`Invested: ${formatCurrency(res.invested)} (${investedPct.toFixed(1)}%)`}
          />
          <div
            style={{ width: `${returnsPct}%` }}
            className="bg-brass h-full transition-all duration-300"
            title={`Est. Wealth Gain: ${formatCurrency(res.returns)} (${returnsPct.toFixed(1)}%)`}
          />
        </div>
        <div className="flex justify-between text-xs text-ink-soft mt-2">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 bg-ink inline-block" />
            <span>Invested Amount: <b className="text-ink tabular-nums">{formatCurrency(res.invested)}</b></span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 bg-brass inline-block" />
            <span>Estimated Gain: <b className="text-ink tabular-nums">{formatCurrency(res.returns)}</b></span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="calculators-page pt-6 max-w-desk mx-auto">
      {/* Header */}
      <div className="flex items-baseline justify-between border-b border-rule pb-3 mb-6">
        <div>
          <h1 className="font-serif text-3xl font-medium text-ink">Financial Desks & Calculators</h1>
          <p className="text-xs text-ink-soft mt-1">Mathematical projections for disciplined long-term capital allocation</p>
        </div>
        <span className="text-xs font-mono text-ink-soft uppercase">— Pure Client Math</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-rule space-x-6 text-sm mb-8">
        {[
          { id: 'sip', label: 'Systematic Investment (SIP)' },
          { id: 'stepup', label: 'Step-Up SIP' },
          { id: 'lumpsum', label: 'Lumpsum Growth' },
          { id: 'goal', label: 'Reverse Goal Planner' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as CalculatorTab)}
            className={`pb-2 transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'border-b-2 border-ink text-ink font-semibold'
                : 'text-ink-soft hover:text-ink border-b-2 border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Regular SIP */}
      {activeTab === 'sip' && (
        <div>
          <p className="text-xs italic text-ink-soft mb-6">
            Calculate the compound future value of periodic monthly equity contributions over an investment horizon.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border-b-2 border-ink pb-2">
              <label className="block text-[11px] text-ink-soft uppercase font-mono mb-1">Monthly Investment (₹)</label>
              <input
                type="number"
                value={sipMonthly}
                onChange={(e) => setSipMonthly(Number(e.target.value))}
                className="w-full bg-transparent font-serif text-xl text-ink outline-none"
              />
            </div>
            <div className="border-b-2 border-ink pb-2">
              <label className="block text-[11px] text-ink-soft uppercase font-mono mb-1">Expected Return (% p.a.)</label>
              <input
                type="number"
                step="0.5"
                value={sipRate}
                onChange={(e) => setSipRate(Number(e.target.value))}
                className="w-full bg-transparent font-serif text-xl text-ink outline-none"
              />
            </div>
            <div className="border-b-2 border-ink pb-2">
              <label className="block text-[11px] text-ink-soft uppercase font-mono mb-1">Time Horizon (Years)</label>
              <input
                type="number"
                value={sipYears}
                onChange={(e) => setSipYears(Number(e.target.value))}
                className="w-full bg-transparent font-serif text-xl text-ink outline-none"
              />
            </div>
          </div>

          <div className="p-6 bg-paper-inset border border-rule my-8">
            <div className="text-xs text-ink-soft font-mono uppercase">— Projected Terminal Value</div>
            <div className="font-serif text-4xl font-semibold text-ink my-2 tabular-nums">
              {formatCurrency(sipResult.totalValue)}
            </div>
            {renderTwoSegmentBar(sipResult)}
          </div>
        </div>
      )}

      {/* TAB 2: Step-up SIP */}
      {activeTab === 'stepup' && (
        <div>
          <p className="text-xs italic text-ink-soft mb-6">
            Model the accelerated compounding achieved when periodic monthly SIP installments scale up annually alongside earnings growth.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="border-b-2 border-ink pb-2">
              <label className="block text-[11px] text-ink-soft uppercase font-mono mb-1">Initial Monthly (₹)</label>
              <input
                type="number"
                value={stepUpMonthly}
                onChange={(e) => setStepUpMonthly(Number(e.target.value))}
                className="w-full bg-transparent font-serif text-xl text-ink outline-none"
              />
            </div>
            <div className="border-b-2 border-ink pb-2">
              <label className="block text-[11px] text-ink-soft uppercase font-mono mb-1">Annual Step-up (%)</label>
              <input
                type="number"
                value={stepUpPct}
                onChange={(e) => setStepUpPct(Number(e.target.value))}
                className="w-full bg-transparent font-serif text-xl text-ink outline-none"
              />
            </div>
            <div className="border-b-2 border-ink pb-2">
              <label className="block text-[11px] text-ink-soft uppercase font-mono mb-1">Expected Return (% p.a.)</label>
              <input
                type="number"
                step="0.5"
                value={stepUpRate}
                onChange={(e) => setStepUpRate(Number(e.target.value))}
                className="w-full bg-transparent font-serif text-xl text-ink outline-none"
              />
            </div>
            <div className="border-b-2 border-ink pb-2">
              <label className="block text-[11px] text-ink-soft uppercase font-mono mb-1">Horizon (Years)</label>
              <input
                type="number"
                value={stepUpYears}
                onChange={(e) => setStepUpYears(Number(e.target.value))}
                className="w-full bg-transparent font-serif text-xl text-ink outline-none"
              />
            </div>
          </div>

          <div className="p-6 bg-paper-inset border border-rule my-8">
            <div className="text-xs text-ink-soft font-mono uppercase">— Projected Terminal Value</div>
            <div className="font-serif text-4xl font-semibold text-ink my-2 tabular-nums">
              {formatCurrency(stepUpResult.totalValue)}
            </div>
            {renderTwoSegmentBar(stepUpResult)}
          </div>
        </div>
      )}

      {/* TAB 3: Lumpsum */}
      {activeTab === 'lumpsum' && (
        <div>
          <p className="text-xs italic text-ink-soft mb-6">
            Project the compound terminal growth of a one-time capital commitment compounded continuously across years.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border-b-2 border-ink pb-2">
              <label className="block text-[11px] text-ink-soft uppercase font-mono mb-1">Lumpsum Investment (₹)</label>
              <input
                type="number"
                value={lumpsumPrincipal}
                onChange={(e) => setLumpsumPrincipal(Number(e.target.value))}
                className="w-full bg-transparent font-serif text-xl text-ink outline-none"
              />
            </div>
            <div className="border-b-2 border-ink pb-2">
              <label className="block text-[11px] text-ink-soft uppercase font-mono mb-1">Expected Return (% p.a.)</label>
              <input
                type="number"
                step="0.5"
                value={lumpsumRate}
                onChange={(e) => setLumpsumRate(Number(e.target.value))}
                className="w-full bg-transparent font-serif text-xl text-ink outline-none"
              />
            </div>
            <div className="border-b-2 border-ink pb-2">
              <label className="block text-[11px] text-ink-soft uppercase font-mono mb-1">Horizon (Years)</label>
              <input
                type="number"
                value={lumpsumYears}
                onChange={(e) => setLumpsumYears(Number(e.target.value))}
                className="w-full bg-transparent font-serif text-xl text-ink outline-none"
              />
            </div>
          </div>

          <div className="p-6 bg-paper-inset border border-rule my-8">
            <div className="text-xs text-ink-soft font-mono uppercase">— Projected Terminal Value</div>
            <div className="font-serif text-4xl font-semibold text-ink my-2 tabular-nums">
              {formatCurrency(lumpsumResult.totalValue)}
            </div>
            {renderTwoSegmentBar(lumpsumResult)}
          </div>
        </div>
      )}

      {/* TAB 4: Reverse Goal Planner */}
      {activeTab === 'goal' && (
        <div>
          <p className="text-xs italic text-ink-soft mb-6">
            Calculate the exact monthly SIP required today to achieve a future target adjusted forward for expected inflation.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="border-b-2 border-ink pb-2">
              <label className="block text-[11px] text-ink-soft uppercase font-mono mb-1">Target in Today's Money (₹)</label>
              <input
                type="number"
                value={goalTarget}
                onChange={(e) => setGoalTarget(Number(e.target.value))}
                className="w-full bg-transparent font-serif text-xl text-ink outline-none"
              />
            </div>
            <div className="border-b-2 border-ink pb-2">
              <label className="block text-[11px] text-ink-soft uppercase font-mono mb-1">Annual Inflation (%)</label>
              <input
                type="number"
                step="0.5"
                value={goalInflation}
                onChange={(e) => setGoalInflation(Number(e.target.value))}
                className="w-full bg-transparent font-serif text-xl text-ink outline-none"
              />
            </div>
            <div className="border-b-2 border-ink pb-2">
              <label className="block text-[11px] text-ink-soft uppercase font-mono mb-1">Expected Return (% p.a.)</label>
              <input
                type="number"
                step="0.5"
                value={goalReturn}
                onChange={(e) => setGoalReturn(Number(e.target.value))}
                className="w-full bg-transparent font-serif text-xl text-ink outline-none"
              />
            </div>
            <div className="border-b-2 border-ink pb-2">
              <label className="block text-[11px] text-ink-soft uppercase font-mono mb-1">Years to Goal</label>
              <input
                type="number"
                value={goalYears}
                onChange={(e) => setGoalYears(Number(e.target.value))}
                className="w-full bg-transparent font-serif text-xl text-ink outline-none"
              />
            </div>
          </div>

          <div className="p-6 bg-paper-inset border border-rule my-8">
            <div className="text-xs text-ink-soft font-mono uppercase">— Required Monthly SIP</div>
            <div className="font-serif text-4xl font-semibold text-gain my-2 tabular-nums">
              {formatCurrency(goalResult.requiredMonthlySip)} / month
            </div>
            <div className="text-xs text-ink-soft mt-3 space-y-1">
              <div>Inflated Target Needed at Horizon: <b className="text-ink">{formatCurrency(goalResult.inflatedTarget)}</b></div>
              <div>Total Capital Contributed: <b className="text-ink">{formatCurrency(goalResult.totalInvested)}</b></div>
              <div>Compound Wealth Gain: <b className="text-gain">{formatCurrency(goalResult.wealthGained)}</b></div>
            </div>
          </div>
        </div>
      )}

      {/* Illustrative Disclaimer Note */}
      <div className="p-3 bg-paper-inset border border-dashed border-rule text-xs text-ink-soft italic">
        Note: Computations above are strictly illustrative mathematical models based on compounding assumptions. They do not constitute investment advice or guarantee future portfolio returns.
      </div>
    </div>
  );
};
