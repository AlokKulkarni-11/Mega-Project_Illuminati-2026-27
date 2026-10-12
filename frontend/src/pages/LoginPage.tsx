import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    } catch {
      setErrorMsg('Invalid email or password credentials. Please verify your details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page max-w-sm mx-auto pt-16">
      <div className="border-b border-rule pb-3 mb-6">
        <h1 className="font-serif text-3xl font-medium text-ink">Sign In to Desk</h1>
        <p className="text-xs text-ink-soft mt-1">Access saved case files, personalized watchlists, and research logs</p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-paper-inset border border-loss text-xs text-loss mb-6">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="border-b-2 border-ink pb-1">
          <label className="block text-[11px] text-ink-soft uppercase font-mono mb-1">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="analyst@marketmind.app"
            className="w-full bg-transparent border-none outline-none font-serif text-base text-ink placeholder:italic placeholder:text-[#8C9187]"
            required
          />
        </div>

        <div className="border-b-2 border-ink pb-1">
          <label className="block text-[11px] text-ink-soft uppercase font-mono mb-1">Access Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-transparent border-none outline-none font-serif text-base text-ink"
            required
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-ink text-paper font-sans text-xs font-semibold tracking-wider uppercase hover:bg-brass transition-colors cursor-pointer"
          >
            {isLoading ? 'Authenticating…' : 'Enter Research Desk →'}
          </button>
        </div>
      </form>

      {/* Demo Credentials Box */}
      <div className="mt-6 p-3 bg-paper-inset border border-rule text-xs text-ink-soft">
        <div className="flex justify-between items-center mb-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink font-semibold">Demo Credentials</span>
          <button
            type="button"
            onClick={() => {
              setEmail('demo@marketmind.app');
              setPassword('password123');
            }}
            className="text-[11px] text-ink underline hover:text-brass cursor-pointer"
          >
            Quick Fill
          </button>
        </div>
        <div className="font-mono text-[11px] text-ink space-y-0.5">
          <div><span className="text-ink-soft">Email:</span> demo@marketmind.app</div>
          <div><span className="text-ink-soft">Pass:</span> password123</div>
        </div>
      </div>

      <div className="mt-8 pt-4 border-t border-rule text-xs text-ink-soft flex justify-between">
        <span>No credentials yet?</span>
        <Link to="/register" className="text-ink hover:underline font-medium">Create Account</Link>
      </div>
    </div>
  );
};
