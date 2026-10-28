import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';


const Field: React.FC<{ id: string; label: string; type?: string; value: string; onChange: (v: string) => void; autoComplete?: string }> = ({ id, label, type = 'text', value, onChange, autoComplete }) => (
  <div className="my-[18px]">
    <label htmlFor={id} className="block text-xs uppercase tracking-[.06em] text-ink-soft mb-0.5">{label}</label>
    <input id={id} type={type} value={value} autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)}
      className="w-full bg-transparent border-0 border-b-2 border-ink py-1.5 text-[17px] text-ink outline-none focus:border-brass rounded-none" />
  </div>
);

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [email, setEmail] = useState('demo@marketmind.app');
  const [password, setPassword] = useState('password123');
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
    <div className="login-page max-w-[380px] mx-auto pt-[9vh]">
      <div className="font-serif text-[34px] font-bold tracking-tight">Market<span className="text-brass">Mind</span></div>
      <p className="text-ink-soft mt-1">Why did it move? A research desk for Indian markets.</p>
      <h1 className="font-serif text-xl mt-7">Sign in</h1>
      <form onSubmit={handleSubmit}>
        <Field id="email" label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <Field id="password" label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
        <div className="text-[13px] text-loss min-h-[20px]">{errorMsg}</div>
        <button type="submit" disabled={isLoading} className="bg-ink text-paper px-[14px] py-1.5 cursor-pointer">
          {isLoading ? 'Signing in…' : 'Sign in'}
        </button>
        <Link to="/register" className="ml-[10px] text-ink-soft underline text-sm">Create an account</Link>
        <Link to="/" className="ml-[10px] text-ink-soft underline text-sm">← Back</Link>
      </form>
      <p className="text-xs text-ink-soft mt-7">
        Demo account is pre-filled. MarketMind explains the past using historical prices and news. It does not predict prices and is not investment advice.
      </p>
    </div>
  );
};
