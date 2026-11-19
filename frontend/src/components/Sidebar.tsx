import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Capabilities } from '../types';

interface SidebarProps {
  capabilities?: Capabilities;
  isPinned?: boolean;
  onPinChange?: (pinned: boolean) => void;
  onExpandedChange?: (expanded: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  capabilities,
  isPinned: externalPinned,
  onPinChange,
  onExpandedChange,
}) => {
  const { user, token, logout } = useAuth();
  const location = useLocation();
  const isEngineEnabled = capabilities?.engine?.enabled ?? true;

  // Internal pin state synchronized with localStorage
  const [internalPinned, setInternalPinned] = useState<boolean>(() => {
    try {
      return localStorage.getItem('mm_sidebar_pinned') === 'true';
    } catch {
      return false;
    }
  });

  const isPinned = externalPinned !== undefined ? externalPinned : internalPinned;
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const togglePin = () => {
    const nextPinned = !isPinned;
    setInternalPinned(nextPinned);
    try {
      localStorage.setItem('mm_sidebar_pinned', String(nextPinned));
    } catch {
      // ignore storage errors
    }
    onPinChange?.(nextPinned);
  };

  const isExpanded = isPinned || isHovered;

  useEffect(() => {
    onExpandedChange?.(isExpanded);
  }, [isExpanded, onExpandedChange]);

  const navItems = [
    ...(isEngineEnabled
      ? [
          {
            to: '/',
            label: 'Research Desk',
            badge: 'Core',
            icon: (
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            ),
          },
          {
            to: '/pulse',
            label: 'Pulse & Sectors',
            icon: (
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            ),
          },
          {
            to: '/compare',
            label: 'Comparison',
            icon: (
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            ),
          },
          {
            to: '/digest',
            label: 'Daily Digest',
            icon: (
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            ),
          },
        ]
      : []),
    {
      to: '/watchlist',
      label: 'Watchlist',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
    },
    {
      to: '/calculators',
      label: 'Calculators',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      to: '/glossary',
      label: 'Glossary',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      to: '/history',
      label: 'History',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed top-0 left-0 h-screen bg-white dark:bg-slate-900 border-r border-slate-200/90 dark:border-slate-800 z-40 transition-all duration-300 ease-in-out flex flex-col justify-between select-none ${
        isExpanded ? 'w-64 shadow-xl' : 'w-16 shadow-xs'
      }`}
      aria-label="Sidebar Navigation"
    >
      {/* Top Header: Brand + Pin Toggle */}
      <div>
        <div className="h-16 flex items-center justify-between px-3.5 border-b border-slate-100 dark:border-slate-800">
          <Link to="/" className="flex items-center gap-3 overflow-hidden">
            {/* Geometric Brand Icon */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-300 p-0.5 shadow-xs shrink-0 flex items-center justify-center">
              <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[10px] flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
            </div>

            {/* Brand Title (visible when expanded) */}
            {isExpanded && (
              <div className="flex flex-col whitespace-nowrap overflow-hidden transition-opacity duration-200">
                <span className="text-sm font-black tracking-tight text-slate-950 dark:text-slate-100">
                  marketmind<span className="text-amber-600 dark:text-amber-400">.ai</span>
                </span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  {capabilities?.engine?.mode === 'mock' ? 'MOCK FIXTURES' : 'FINANCIAL INTEL'}
                </span>
              </div>
            )}
          </Link>

          {/* Pin / Unpin Button (visible when expanded) */}
          {isExpanded && (
            <button
              onClick={togglePin}
              title={isPinned ? 'Unpin sidebar (auto-collapse on mouse leave)' : 'Pin sidebar permanently'}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                isPinned
                  ? 'bg-amber-100/80 dark:bg-amber-950/60 border-amber-400 dark:border-amber-600 text-amber-900 dark:text-amber-300 shadow-xs'
                  : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              aria-label={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
            >
              {/* Thumbtack Pin SVG Icon */}
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${isPinned ? 'rotate-0' : 'rotate-45'}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="17" x2="12" y2="22" />
                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
              </svg>
            </button>
          )}
        </div>

        {/* Navigation Item List */}
        <nav className="p-2 space-y-1.5 mt-2">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                title={!isExpanded ? item.label : undefined}
                className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all group ${
                  active
                    ? 'bg-amber-100/70 dark:bg-amber-950/50 text-slate-950 dark:text-amber-300 font-bold border border-amber-300/90 dark:border-amber-600 shadow-xs'
                    : 'text-slate-800 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/80 border border-transparent'
                }`}
              >
                <div
                  className={`transition-colors ${
                    active ? 'text-amber-700 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-950 dark:group-hover:text-white'
                  }`}
                >
                  {item.icon}
                </div>

                {/* Text Label (shown only when expanded) */}
                {isExpanded && (
                  <div className="flex-1 flex items-center justify-between whitespace-nowrap overflow-hidden transition-opacity duration-200">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] uppercase tracking-wider font-mono font-bold bg-amber-200 dark:bg-amber-900/60 text-amber-950 dark:text-amber-200 px-1.5 py-0.5 rounded">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile / Status Area */}
      <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/50">
        {user && token ? (
          <div className="space-y-1">
            <Link
              to="/profile"
              className={`flex items-center gap-3 px-2 py-2 rounded-xl transition-all hover:border-amber-500 ${
                isExpanded ? 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-xs' : 'justify-center'
              }`}
              title={!isExpanded ? `${user.fullName || user.email} (View Profile)` : undefined}
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-200 dark:bg-emerald-900/60 text-emerald-950 dark:text-emerald-200 font-black text-xs flex items-center justify-center shrink-0">
                {(user.fullName || user.email).charAt(0).toUpperCase()}
              </div>

              {isExpanded && (
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="text-xs font-black text-slate-900 dark:text-slate-100 truncate hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                    {user.fullName || 'Analyst'}
                  </div>
                  <div className="text-[10px] font-medium text-slate-600 dark:text-slate-400 truncate">{user.email}</div>
                </div>
              )}
            </Link>

            {isExpanded && (
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-slate-800 py-1.5 px-3 rounded-lg border border-transparent hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <Link
              to="/login"
              title={!isExpanded ? 'Sign in' : undefined}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white border border-transparent hover:border-slate-300 dark:hover:border-slate-700 transition-all ${
                !isExpanded ? 'justify-center' : ''
              }`}
            >
              <svg className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              {isExpanded && <span>Sign in</span>}
            </Link>

            {isExpanded && (
              <Link
                to="/register"
                className="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1 shadow-xs transition-all active:scale-98"
              >
                Sign up ▾
              </Link>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
