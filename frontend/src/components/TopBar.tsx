import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Capabilities } from '../types';

interface TopBarProps {
  capabilities?: Capabilities;
}

export const TopBar: React.FC<TopBarProps> = ({ capabilities }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isEngineEnabled = capabilities?.engine?.enabled ?? true;

  const navLinks = [
    ...(isEngineEnabled
      ? [
          { to: '/', label: 'Research Desk' },
          { to: '/pulse', label: 'Pulse & Sectors' },
          { to: '/compare', label: 'Comparison' },
          { to: '/digest', label: 'Daily Digest' },
        ]
      : []),
    { to: '/watchlist', label: 'Watchlist' },
    { to: '/calculators', label: 'Calculators' },
    { to: '/glossary', label: 'Glossary' },
    { to: '/history', label: 'History' },
  ];

  return (
    <header className="flex justify-between items-baseline flex-wrap pt-9 pb-5 border-b border-rule">
      <div className="flex items-baseline space-x-6">
        <Link to="/" className="font-serif text-2xl font-semibold tracking-tight text-ink hover:text-ink">
          Market<span className="text-brass">Mind</span>
        </Link>
        <span className="text-xs text-ink-soft hidden sm:inline italic">research desk</span>
      </div>

      <nav className="flex items-center flex-wrap gap-x-5 gap-y-2 text-sm text-ink-soft mt-3 sm:mt-0">
        {navLinks.map((link) => {
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`hover:text-ink transition-colors pb-0.5 ${
                isActive ? 'text-ink border-b border-ink font-medium' : 'border-b border-transparent'
              }`}
            >
              {link.label}
            </Link>
          );
        })}

        <div className="pl-4 border-l border-rule flex items-center space-x-3 text-xs">
          {user ? (
            <>
              <span className="text-ink font-medium">{user.fullName || user.email}</span>
              <button
                onClick={logout}
                className="text-loss hover:underline cursor-pointer"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-ink underline">Sign In</Link>
              <Link to="/register" className="hover:text-ink underline">Register</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};
