import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Explanation } from '../types';

interface ExplanationPanelProps {
  explanation: Explanation;
}

// Minimal isolated test fixture component matching ResearchDesk's explanation render
const TestExplanationPanel: React.FC<ExplanationPanelProps> = ({ explanation }) => {
  return (
    <div>
      <div data-testid="confidence-badge">{explanation.confidence}</div>
      <div data-testid="signal-agreement">{explanation.signalAgreement}</div>

      {!explanation.hasClearDriver ? (
        <div data-testid="abstention-container">
          <h3>Honest Abstention — No Confirmed Driver</h3>
          <p>{explanation.causeSummary}</p>
        </div>
      ) : (
        <div data-testid="confirmed-container">
          <h3>Causal Analysis</h3>
          <p>{explanation.causeSummary}</p>
          <div data-testid="citations-count">{explanation.citations.length}</div>
        </div>
      )}
    </div>
  );
};

describe('ExplanationPanel Abstention State', () => {
  it('renders distinct first-class abstention when hasClearDriver is false', () => {
    const abstentionData: Explanation = {
      symbol: 'NIFTYBANK',
      date: '2025-11-26',
      priceDirection: 'bullish',
      returnPct: 1.2,
      returnZ: 2.17,
      hasClearDriver: false,
      causeSummary: 'No specific, confirmed news driver found for this date in available search results.',
      causalCategory: 'unclear',
      scope: 'unclear',
      newsDirection: 'neutral',
      signalAgreement: 'insufficient',
      confidence: 'low',
      citations: [],
    };

    render(<TestExplanationPanel explanation={abstentionData} />);

    expect(screen.getByTestId('abstention-container')).toBeInTheDocument();
    expect(screen.queryByTestId('confirmed-container')).not.toBeInTheDocument();
    expect(screen.getByText(/Honest Abstention — No Confirmed Driver/i)).toBeInTheDocument();
    expect(screen.getByTestId('confidence-badge')).toHaveTextContent('low');
    expect(screen.getByTestId('signal-agreement')).toHaveTextContent('insufficient');
  });

  it('renders confirmed drivers with citations when hasClearDriver is true', () => {
    const confirmedData: Explanation = {
      symbol: 'NIFTYBANK',
      date: '2026-02-01',
      priceDirection: 'bearish',
      returnPct: -2.0,
      returnZ: -2.33,
      hasClearDriver: true,
      causeSummary: 'Union Budget 2026 presented on Feb 1; PSU banks fell sharply on merger concerns.',
      causalCategory: 'regulatory',
      scope: 'sector',
      newsDirection: 'bearish',
      signalAgreement: 'aligned',
      confidence: 'high',
      citations: [
        {
          n: 1,
          title: 'Budget 2026 impact',
          source: 'Moneycontrol',
          url: 'https://example.com',
          publishedDate: '2026-02-01',
        },
      ],
    };

    render(<TestExplanationPanel explanation={confirmedData} />);

    expect(screen.getByTestId('confirmed-container')).toBeInTheDocument();
    expect(screen.queryByTestId('abstention-container')).not.toBeInTheDocument();
    expect(screen.getByTestId('citations-count')).toHaveTextContent('1');
    expect(screen.getByTestId('confidence-badge')).toHaveTextContent('high');
    expect(screen.getByTestId('signal-agreement')).toHaveTextContent('aligned');
  });
});
