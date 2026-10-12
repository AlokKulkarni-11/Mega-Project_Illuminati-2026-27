import { describe, it, expect } from 'vitest';
import {
  calculateSip,
  calculateStepUpSip,
  calculateLumpsum,
  calculateGoalPlanner,
} from './formulas';

describe('Financial Calculator Formulas', () => {
  describe('SIP Calculator', () => {
    it('accurately computes FV for 10,000/month at 12% for 10 years', () => {
      // P = 10000, r = 12% -> i = 0.01, n = 120
      // FV = 10000 * (((1.01)^120 - 1) / 0.01) * 1.01 = ~2323391
      const result = calculateSip(10000, 12, 10);
      expect(result.invested).toBe(1200000);
      expect(result.totalValue).toBeGreaterThan(2320000);
      expect(result.totalValue).toBeLessThan(2330000);
      expect(result.returns).toBe(result.totalValue - result.invested);
    });

    it('handles zero duration or zero investment', () => {
      expect(calculateSip(0, 12, 10).totalValue).toBe(0);
      expect(calculateSip(10000, 12, 0).totalValue).toBe(0);
    });
  });

  describe('Lumpsum Calculator', () => {
    it('accurately computes FV = P*(1+r)^t for 100,000 at 10% for 5 years', () => {
      // 100000 * 1.1^5 = 161051
      const result = calculateLumpsum(100000, 10, 5);
      expect(result.invested).toBe(100000);
      expect(result.totalValue).toBe(161051);
      expect(result.returns).toBe(61051);
    });

    it('handles zero years', () => {
      const result = calculateLumpsum(50000, 10, 0);
      expect(result.invested).toBe(50000);
      expect(result.totalValue).toBe(50000);
      expect(result.returns).toBe(0);
    });
  });

  describe('Step-Up SIP Calculator', () => {
    it('computes higher wealth than regular SIP when step-up is positive', () => {
      const regular = calculateSip(10000, 12, 5);
      const stepUp = calculateStepUpSip(10000, 10, 12, 5);

      expect(stepUp.invested).toBeGreaterThan(regular.invested);
      expect(stepUp.totalValue).toBeGreaterThan(regular.totalValue);
    });

    it('matches regular SIP when step-up percentage is 0', () => {
      const regular = calculateSip(10000, 12, 3);
      const stepUp = calculateStepUpSip(10000, 0, 12, 3);

      expect(stepUp.invested).toBe(regular.invested);
      expect(Math.abs(stepUp.totalValue - regular.totalValue)).toBeLessThanOrEqual(5);
    });
  });

  describe('Goal Planner (Reverse)', () => {
    it('calculates inflated goal and required monthly SIP', () => {
      // 10 lakhs in 10 years with 6% inflation, 12% expected return
      const result = calculateGoalPlanner(1000000, 6, 12, 10);
      // Inflated target: 1000000 * 1.06^10 = ~1790848
      expect(result.inflatedTarget).toBeGreaterThan(1780000);
      expect(result.requiredMonthlySip).toBeGreaterThan(0);
      expect(result.totalInvested).toBe(result.requiredMonthlySip * 120);
      expect(result.wealthGained).toBe(result.inflatedTarget - result.totalInvested);
    });
  });
});
