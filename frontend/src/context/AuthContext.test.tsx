import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { TopBar } from '../components/TopBar';
import * as authApi from '../api/auth';

// Test consumer component
const AuthTestConsumer: React.FC = () => {
  const { user, token, login, logout, register } = useAuth();
  return (
    <div>
      <div data-testid="user-email">{user ? user.email : 'anonymous'}</div>
      <div data-testid="user-token">{token ? 'has-token' : 'no-token'}</div>
      <button onClick={() => login('demo@marketmind.app', 'password123')}>Login</button>
      <button onClick={() => register('new@marketmind.app', 'password123', 'New Analyst')}>Register</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('Frontend Authentication Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('initializes with anonymous user when no token exists in localStorage', () => {
    render(
      <AuthProvider>
        <AuthTestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('user-email')).toHaveTextContent('anonymous');
    expect(screen.getByTestId('user-token')).toHaveTextContent('no-token');
  });

  it('authenticates user and persists credentials on login', async () => {
    const mockUser = {
      id: 'mock-uuid-1',
      email: 'demo@marketmind.app',
      fullName: 'Demo Analyst',
      createdAt: '2026-01-01T00:00:00Z',
    };

    vi.spyOn(authApi, 'loginApi').mockResolvedValueOnce({
      token: 'mock-jwt-token-xyz',
      tokenType: 'Bearer',
      expiresInMs: 3600000,
      user: mockUser,
    });

    render(
      <AuthProvider>
        <AuthTestConsumer />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText('Login').click();
    });

    expect(screen.getByTestId('user-email')).toHaveTextContent('demo@marketmind.app');
    expect(screen.getByTestId('user-token')).toHaveTextContent('has-token');
    expect(localStorage.getItem('marketmind_token')).toBe('mock-jwt-token-xyz');
    expect(JSON.parse(localStorage.getItem('marketmind_user') || '{}').email).toBe('demo@marketmind.app');
  });

  it('registers user and persists session on register', async () => {
    const mockUser = {
      id: 'mock-uuid-2',
      email: 'new@marketmind.app',
      fullName: 'New Analyst',
      createdAt: '2026-01-01T00:00:00Z',
    };

    vi.spyOn(authApi, 'registerApi').mockResolvedValueOnce({
      token: 'mock-jwt-token-abc',
      tokenType: 'Bearer',
      expiresInMs: 3600000,
      user: mockUser,
      needsEmailVerification: false,
    });

    render(
      <AuthProvider>
        <AuthTestConsumer />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText('Register').click();
    });

    expect(screen.getByTestId('user-email')).toHaveTextContent('new@marketmind.app');
    expect(screen.getByTestId('user-token')).toHaveTextContent('has-token');
    expect(localStorage.getItem('marketmind_token')).toBe('mock-jwt-token-abc');
  });

  it('does not persist session or log user in when email verification is required', async () => {
    const mockUser = {
      id: 'mock-uuid-3',
      email: 'unconfirmed@marketmind.app',
      fullName: 'Unconfirmed User',
      createdAt: '2026-01-01T00:00:00Z',
    };

    vi.spyOn(authApi, 'registerApi').mockResolvedValueOnce({
      token: '',
      tokenType: 'Bearer',
      expiresInMs: 0,
      user: mockUser,
      needsEmailVerification: true,
    });

    render(
      <AuthProvider>
        <AuthTestConsumer />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText('Register').click();
    });

    expect(screen.getByTestId('user-email')).toHaveTextContent('anonymous');
    expect(screen.getByTestId('user-token')).toHaveTextContent('no-token');
    expect(localStorage.getItem('marketmind_token')).toBeNull();
    expect(localStorage.getItem('marketmind_user')).toBeNull();
  });

  it('clears session and localStorage on logout', async () => {
    localStorage.setItem('marketmind_token', 'initial-token');
    localStorage.setItem(
      'marketmind_user',
      JSON.stringify({ id: 'u1', email: 'stored@marketmind.app', fullName: 'Stored User' })
    );

    vi.spyOn(authApi, 'getMeApi').mockResolvedValueOnce({
      id: 'u1',
      email: 'stored@marketmind.app',
      fullName: 'Stored User',
      createdAt: '2026-01-01T00:00:00Z',
    });

    render(
      <AuthProvider>
        <AuthTestConsumer />
      </AuthProvider>
    );

    // Wait for initial getMeApi to settle
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(screen.getByTestId('user-email')).toHaveTextContent('stored@marketmind.app');

    await act(async () => {
      screen.getByText('Logout').click();
    });

    expect(screen.getByTestId('user-email')).toHaveTextContent('anonymous');
    expect(screen.getByTestId('user-token')).toHaveTextContent('no-token');
    expect(localStorage.getItem('marketmind_token')).toBeNull();
    expect(localStorage.getItem('marketmind_user')).toBeNull();
  });

  it('renders sign-in links when signed out and user details with sign-out when signed in', () => {
    localStorage.setItem(
      'marketmind_user',
      JSON.stringify({ id: 'u1', email: 'analyst@marketmind.app', fullName: 'Lead Analyst' })
    );
    localStorage.setItem('marketmind_token', 'token-123');

    render(
      <BrowserRouter>
        <AuthProvider>
          <TopBar />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Lead Analyst')).toBeInTheDocument();
    expect(screen.getByText('Sign out')).toBeInTheDocument();
  });
});
