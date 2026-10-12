import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Banner } from './Banner';
import { TopBar } from './TopBar';
import { Capabilities } from '../types';

import { AuthProvider } from '../context/AuthContext';

describe('Capabilities Gating & Banner Presentation', () => {
  it('displays persistent "Sample data — engine not connected" banner in mock mode', () => {
    const mockCapabilities: Capabilities = {
      engine: {
        enabled: true,
        mode: 'mock',
        status: 'HEALTHY',
      },
      features: { dossier: true, calculators: true },
    };

    render(<Banner engine={mockCapabilities.engine} />);

    expect(screen.getByText(/Sample data — engine not connected/i)).toBeInTheDocument();
    expect(screen.getByText(/MOCK MODE/i)).toBeInTheDocument();
  });

  it('displays "Market intelligence engine not connected" when disabled', () => {
    const disabledCapabilities: Capabilities = {
      engine: {
        enabled: false,
        mode: 'disabled',
        status: 'DISABLED',
      },
      features: { calculators: true, glossary: true },
    };

    render(<Banner engine={disabledCapabilities.engine} />);

    expect(screen.getByText(/Market intelligence engine not connected/i)).toBeInTheDocument();
    expect(screen.getByText(/OFFLINE/i)).toBeInTheDocument();
  });

  it('hides engine links (Research Desk, Pulse, Comparison) in TopBar when engine is disabled', () => {
    const disabledCapabilities: Capabilities = {
      engine: {
        enabled: false,
        mode: 'disabled',
        status: 'DISABLED',
      },
      features: { calculators: true },
    };

    render(
      <BrowserRouter>
        <AuthProvider>
          <TopBar capabilities={disabledCapabilities} />
        </AuthProvider>
      </BrowserRouter>
    );

    // Engine links should not be present
    expect(screen.queryByText('Pulse & Sectors')).not.toBeInTheDocument();
    expect(screen.queryByText('Comparison')).not.toBeInTheDocument();
    // Engine-independent links must remain present
    expect(screen.getByText('Watchlist')).toBeInTheDocument();
    expect(screen.getByText('Calculators')).toBeInTheDocument();
    expect(screen.getByText('Glossary')).toBeInTheDocument();
  });
});
