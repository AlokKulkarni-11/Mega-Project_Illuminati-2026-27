import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { GlossaryTerm } from './GlossaryTerm';

describe('GlossaryTerm component', () => {
  it('renders the glossary term trigger button with accessible attributes', () => {
    render(<GlossaryTerm termKey="z-score" />);
    const button = screen.getByRole('button', { name: /Z-Score/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggles definition tooltip when clicked', () => {
    render(<GlossaryTerm termKey="abstention" />);
    const button = screen.getByRole('button', { name: /Abstention/i });

    // Initially closed
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    // Click to open
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent(/declining to fabricate a driver/i);

    // Click again to close
    fireEvent.click(button);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('closes tooltip when Escape key is pressed', () => {
    render(<GlossaryTerm termKey="regime" />);
    const button = screen.getByRole('button', { name: /Regime/i });

    fireEvent.click(button);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.keyDown(button, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('renders custom children when provided', () => {
    render(<GlossaryTerm termKey="beta">Custom Beta Label</GlossaryTerm>);
    expect(screen.getByText('Custom Beta Label')).toBeInTheDocument();
  });
});
