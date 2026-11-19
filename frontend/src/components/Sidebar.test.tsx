import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Capabilities } from '../types';
import { AuthProvider } from '../context/AuthContext';

describe('Sidebar Component & Capabilities Gating', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders all engine links when engine is enabled', () => {
    const enabledCapabilities: Capabilities = {
      engine: { enabled: true, mode: 'http', status: 'HEALTHY' },
      features: { dossier: true, calculators: true },
    };

    render(
      <BrowserRouter>
        <AuthProvider>
          <Sidebar capabilities={enabledCapabilities} isPinned={true} />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Research Desk')).toBeInTheDocument();
    expect(screen.getByText('Pulse & Sectors')).toBeInTheDocument();
    expect(screen.getByText('Comparison')).toBeInTheDocument();
    expect(screen.getByText('Daily Digest')).toBeInTheDocument();
    expect(screen.getByText('Watchlist')).toBeInTheDocument();
    expect(screen.getByText('Calculators')).toBeInTheDocument();
    expect(screen.getByText('Glossary')).toBeInTheDocument();
  });

  it('hides engine links when engine is disabled', () => {
    const disabledCapabilities: Capabilities = {
      engine: { enabled: false, mode: 'disabled', status: 'DISABLED' },
      features: { calculators: true },
    };

    render(
      <BrowserRouter>
        <AuthProvider>
          <Sidebar capabilities={disabledCapabilities} isPinned={true} />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.queryByText('Pulse & Sectors')).not.toBeInTheDocument();
    expect(screen.queryByText('Comparison')).not.toBeInTheDocument();
    expect(screen.getByText('Watchlist')).toBeInTheDocument();
    expect(screen.getByText('Calculators')).toBeInTheDocument();
    expect(screen.getByText('Glossary')).toBeInTheDocument();
  });

  it('toggles pin state on click and persists to localStorage', () => {
    const onPinChange = vi.fn();
    render(
      <BrowserRouter>
        <AuthProvider>
          <Sidebar isPinned={false} onPinChange={onPinChange} />
        </AuthProvider>
      </BrowserRouter>
    );

    // Hover sidebar to reveal pin button
    const aside = screen.getByLabelText('Sidebar Navigation');
    fireEvent.mouseEnter(aside);

    const pinButton = screen.getByLabelText('Pin sidebar');
    expect(pinButton).toBeInTheDocument();

    fireEvent.click(pinButton);
    expect(onPinChange).toHaveBeenCalledWith(true);
    expect(localStorage.getItem('mm_sidebar_pinned')).toBe('true');
  });
});
