import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

const Field: React.FC<{
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}> = ({ id, label, type = 'text', value, onChange, placeholder, autoComplete }) => (
  <div className="mb-4">
    <label htmlFor={id} className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
      {label}
    </label>
    <input
      id={id}
      type={type}
      value={value}
      placeholder={placeholder}
      autoComplete={autoComplete}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all placeholder:text-slate-400"
    />
  </div>
);

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const locationState = location.state as { email?: string; message?: string } | undefined;
  const [email, setEmail] = useState<string>(locationState?.email || '');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      await login(email, password);
      showToast('Welcome back to MarketMind Research Desk.', 'success');
      navigate('/');
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : 'Invalid email or password credentials.';
      const isUnconfirmed = rawMsg.toLowerCase().includes('email not confirmed');
      const msg = isUnconfirmed
        ? 'Your email address is not verified yet. Please check your email inbox and spam folder for the confirmation link.'
        : rawMsg;
      setErrorMsg(msg);
      showToast(isUnconfirmed ? 'Email confirmation required' : `Failed to login: ${msg}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-[420px] mx-auto pt-12 pb-20">
      <div className="p-8 bg-white shadow-sm border border-slate-200/90 rounded-3xl">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-300 p-0.5 shadow-xs mb-3">
            <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Sign In to MarketMind
          </h1>
          <p className="text-xs text-slate-500 mt-1">Research desk authentication</p>
        </div>

        {locationState?.message && (
          <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200 p-3.5 rounded-xl mb-4 flex items-start gap-2.5">
            <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <span className="font-bold block mb-0.5">Verification Required</span>
              <span>{locationState.message}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Field
            id="email"
            label="Email Address"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@company.com"
            autoComplete="email"
          />
          <Field
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            autoComplete="current-password"
          />

          {errorMsg && (
            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-xl mb-4 leading-relaxed">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 py-3 px-4 rounded-xl text-sm font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 mt-2 hover:shadow-sm active:scale-98"
          >
            {isLoading ? 'Authenticating…' : 'Sign In to Terminal →'}
          </button>
        </form>

        <div className="flex items-center justify-between text-xs text-slate-500 mt-6 pt-5 border-t border-slate-100">
          <Link to="/register" className="hover:text-slate-900 font-semibold underline">
            Open new account
          </Link>
          <Link to="/" className="hover:text-slate-900 font-medium">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};
