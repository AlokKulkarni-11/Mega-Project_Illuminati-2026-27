import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Capabilities } from '../types';
import { getStoredTheme, toggleAppTheme, AppTheme } from '../theme/themeManager';

interface TopBarProps {
  capabilities?: Capabilities;
  /** Hide the section links (e.g. for signed-out visitors on the landing page). */
  showNav?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({ capabilities, showNav = true }) => {
  const { user, token, logout } = useAuth();
  const location = useLocation();
  const isEngineEnabled = capabilities?.engine?.enabled ?? true;

  const [theme, setTheme] = useState<AppTheme>(getStoredTheme);

  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<AppTheme>;
      setTheme(customEvent.detail || getStoredTheme());
    };
    window.addEventListener('marketmind_theme_change', handleThemeChange);
    return () => window.removeEventListener('marketmind_theme_change', handleThemeChange);
  }, []);

  const handleToggle = () => {
    const next = toggleAppTheme();
    setTheme(next);
  };

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
    <header className="border-b border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-20 transition-colors">
      <div className="flex justify-between items-center py-3 gap-4 flex-wrap">
        {/* Brand Logo or Section Header */}
        <div className="flex items-center gap-4">
          {showNav ? (
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-300 p-0.5 shadow-sm group-hover:scale-105 transition-transform flex items-center justify-center">
                <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[10px] flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-black tracking-tight text-slate-950 dark:text-slate-100">
                  marketmind<span className="text-amber-600 dark:text-amber-400">.ai</span>
                </span>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                NSE Real-Time Terminal
              </span>
            </div>
          )}
        </div>

        {/* Auth / Profile Area */}
        <div className="text-xs flex items-center gap-3">
          {user && token ? (
            <div className="flex items-center gap-3">
              <Link
                to="/profile"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-500 transition-colors group cursor-pointer"
                title="View and edit profile / change password"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400"></span>
                <span className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  {user.fullName || user.email}
                </span>
              </Link>
              <button
                onClick={logout}
                className="text-slate-700 dark:text-slate-300 hover:text-rose-700 dark:hover:text-rose-400 font-bold px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                to="/login"
                className="text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white font-bold px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
              >
                Log in <span className="text-[10px] text-slate-500 font-bold">▾</span>
              </Link>
              <Link
                to="/register"
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 px-4 py-2 rounded-lg font-black shadow-xs transition-all text-xs flex items-center gap-1.5 hover:shadow-sm active:scale-98"
              >
                Sign up <span className="text-[10px]">▾</span>
              </Link>
            </div>
          )}

          {/* Theme Switcher Button */}
          <button
            type="button"
            onClick={handleToggle}
            aria-label="Toggle theme"
            className="w-8 h-8 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              /* Sun Icon */
              <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              /* Moon Icon */
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Primary Navigation Links when logged in or nav requested */}
      {showNav && (
        <nav className="flex flex-wrap gap-1 pt-1 pb-2.5 text-xs font-medium border-t border-slate-100 dark:border-slate-800">
          {navLinks.map((link) => {
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  active
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-950 dark:text-slate-100 font-bold border border-slate-300 dark:border-slate-700 shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
};
