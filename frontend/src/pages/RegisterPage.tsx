import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Email and password are required.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must contain at least 6 characters.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      await register(email, password, fullName);
      showToast('Account registered successfully.', 'success');
      navigate('/');
    } catch {
      setErrorMsg('Registration failed. This email may already be associated with an account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-page max-w-sm mx-auto pt-16">
      <div className="border-b border-rule pb-3 mb-6">
        <h1 className="font-serif text-3xl font-medium text-ink">Register Analyst</h1>
        <p className="text-xs text-ink-soft mt-1">Open an active research case desk on MarketMind</p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-paper-inset border border-loss text-xs text-loss mb-6">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="border-b-2 border-ink pb-1">
          <label className="block text-[11px] text-ink-soft uppercase font-mono mb-1">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Doe"
            className="w-full bg-transparent border-none outline-none font-serif text-base text-ink placeholder:italic placeholder:text-[#8C9187]"
          />
        </div>

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
          <label className="block text-[11px] text-ink-soft uppercase font-mono mb-1">Password (min 6 chars)</label>
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
            {isLoading ? 'Creating Account…' : 'Register Account →'}
          </button>
        </div>
      </form>

      <div className="mt-8 pt-4 border-t border-rule text-xs text-ink-soft flex justify-between">
        <span>Already have an account?</span>
        <Link to="/login" className="text-ink hover:underline font-medium">Sign In</Link>
      </div>
    </div>
  );
};
