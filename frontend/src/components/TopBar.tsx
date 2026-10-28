import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Capabilities } from '../types';

interface TopBarProps {
  capabilities?: Capabilities;
  /** Hide the section links (e.g. for signed-out visitors on the landing page). */
  showNav?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({ capabilities, showNav = true }) => {
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
    { to: '/settings', label: 'Settings' },
  ];

  return (
    <header className="pt-6 border-b border-ink">
      <div className="flex justify-between items-baseline flex-wrap gap-2">
        <Link to="/" className="font-serif text-[22px] font-bold tracking-tight text-ink">
          Market<span className="text-brass">Mind</span>
        </Link>
        <div className="text-[13px] flex items-center gap-4">
          {user ? (
            <>
              <span className="text-ink-soft">{user.fullName || user.email}</span>
              <button onClick={logout} className="text-ink-soft underline cursor-pointer hover:text-ink">Sign out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-ink-soft underline hover:text-ink">Sign in</Link>
              <Link to="/register" className="bg-ink text-paper px-3 py-1.5">Create account</Link>
            </>
          )}
        </div>
      </div>
      {showNav && (
        <nav className="flex flex-wrap gap-x-[18px] gap-y-1 pt-2.5 pb-2 text-sm">
          {navLinks.map((link) => {
            const active = location.pathname === link.to;
            return (
              <Link key={link.to} to={link.to}
                className={`pb-0.5 border-b-2 ${active ? 'text-ink border-ink' : 'text-ink-soft border-transparent hover:text-ink hover:border-ink'}`}>
                {link.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
};
