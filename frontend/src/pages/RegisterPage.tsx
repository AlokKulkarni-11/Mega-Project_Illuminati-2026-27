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
    <div className="max-w-[380px] mx-auto pt-[9vh]">
      <div className="font-serif text-[34px] font-bold tracking-tight">Market<span className="text-brass">Mind</span></div>
      <p className="text-ink-soft mt-1">Why did it move? A research desk for Indian markets.</p>
      <h1 className="font-serif text-xl mt-7">Open an account</h1>
      <form onSubmit={handleSubmit}>
        <Field id="name" label="Full name" value={fullName} onChange={setFullName} autoComplete="name" />
        <Field id="email" label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <Field id="password" label="Password" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
        <div className="text-[13px] text-loss min-h-[20px]">{errorMsg}</div>
        <button type="submit" disabled={isLoading} className="bg-ink text-paper px-[14px] py-1.5 cursor-pointer">
          {isLoading ? 'Creating…' : 'Create account'}
        </button>
        <Link to="/login" className="ml-[10px] text-ink-soft underline text-sm">I have an account</Link>
        <Link to="/" className="ml-[10px] text-ink-soft underline text-sm">← Back</Link>
      </form>
    </div>
  );
};
