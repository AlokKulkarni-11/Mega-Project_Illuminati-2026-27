export interface CalculatorResult {
  invested: number;
  returns: number;
  totalValue: number;
}

export interface GoalPlannerResult {
  requiredMonthlySip: number;
  inflatedTarget: number;
  totalInvested: number;
  wealthGained: number;
}

/**
 * SIP Calculator: FV = P × (((1+i)^n − 1)/i) × (1+i)
 * @param monthlyInvestment P
 * @param annualRatePct annual return rate in % (e.g. 12)
 * @param years investment duration in years
 */
export function calculateSip(
  monthlyInvestment: number,
  annualRatePct: number,
  years: number
): CalculatorResult {
  const P = Math.max(0, monthlyInvestment);
  const n = Math.max(0, Math.round(years * 12));
  const r = annualRatePct / 100;
  const i = r / 12;

  if (n === 0 || P === 0) {
    return { invested: 0, returns: 0, totalValue: 0 };
  }

  if (i === 0) {
    const total = P * n;
    return { invested: total, returns: 0, totalValue: total };
  }

  const fv = P * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
  const invested = P * n;
  const returns = Math.max(0, fv - invested);

  return {
    invested: Math.round(invested),
    returns: Math.round(returns),
    totalValue: Math.round(fv),
  };
}

/**
 * Step-up SIP Calculator:
 * Monthly SIP increased by s% each year; computed year-by-year across all months.
 * @param initialMonthly P
 * @param annualStepUpPct s% annual increment
 * @param annualRatePct annual return rate in %
 * @param years duration in years
 */
export function calculateStepUpSip(
  initialMonthly: number,
  annualStepUpPct: number,
  annualRatePct: number,
  years: number
): CalculatorResult {
  const P = Math.max(0, initialMonthly);
  const totalMonths = Math.max(0, Math.round(years * 12));
  const stepUp = annualStepUpPct / 100;
  const i = annualRatePct / 100 / 12;

  let totalInvested = 0;
  let totalValue = 0;

  for (let month = 1; month <= totalMonths; month++) {
    const yearIndex = Math.floor((month - 1) / 12);
    const monthlyAmount = P * Math.pow(1 + stepUp, yearIndex);
    const monthsRemaining = totalMonths - month + 1;

    totalInvested += monthlyAmount;
    totalValue += monthlyAmount * Math.pow(1 + i, monthsRemaining);
  }

  const returns = Math.max(0, totalValue - totalInvested);

  return {
    invested: Math.round(totalInvested),
    returns: Math.round(returns),
    totalValue: Math.round(totalValue),
  };
}

/**
 * Lumpsum Calculator: FV = P(1+r)^t
 * @param principal P
 * @param annualRatePct annual return rate in %
 * @param years duration in years
 */
export function calculateLumpsum(
  principal: number,
  annualRatePct: number,
  years: number
): CalculatorResult {
  const P = Math.max(0, principal);
  const r = annualRatePct / 100;
  const t = Math.max(0, years);

  if (P === 0 || t === 0) {
    return { invested: P, returns: 0, totalValue: P };
  }

  const fv = P * Math.pow(1 + r, t);
  const returns = Math.max(0, fv - P);

  return {
    invested: Math.round(P),
    returns: Math.round(returns),
    totalValue: Math.round(fv),
  };
}

/**
 * Goal Planner (Reverse):
 * Inflate target: T' = T × (1 + inf)^t
 * Required SIP: SIP = T' × i / ((((1+i)^n) − 1) × (1+i))
 * @param targetAmount T in current currency
 * @param inflationRatePct inflation rate in %
 * @param expectedReturnPct return rate in %
 * @param years duration in years
 */
export function calculateGoalPlanner(
  targetAmount: number,
  inflationRatePct: number,
  expectedReturnPct: number,
  years: number
): GoalPlannerResult {
  const T = Math.max(0, targetAmount);
  const t = Math.max(0, years);
  const n = t * 12;
  const inf = inflationRatePct / 100;
  const r = expectedReturnPct / 100;
  const i = r / 12;

  const inflatedTarget = T * Math.pow(1 + inf, t);

  if (n === 0 || inflatedTarget === 0) {
    return {
      requiredMonthlySip: 0,
      inflatedTarget: Math.round(inflatedTarget),
      totalInvested: 0,
      wealthGained: 0,
    };
  }

  const denominator = ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
  const rawSip = denominator > 0 ? inflatedTarget / denominator : inflatedTarget / n;
  const roundedMonthlySip = Math.round(rawSip);
  const roundedInflatedTarget = Math.round(inflatedTarget);
  const totalInvested = roundedMonthlySip * n;
  const wealthGained = Math.max(0, roundedInflatedTarget - totalInvested);

  return {
    requiredMonthlySip: roundedMonthlySip,
    inflatedTarget: roundedInflatedTarget,
    totalInvested,
    wealthGained,
  };
}
