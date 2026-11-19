import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      setErrorMsg('Please complete all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const result = await register(email, password, fullName);
      setRegisteredEmail(email);
      if (result.needsEmailVerification) {
        setShowVerifyModal(true);
        showToast('Registration successful! Please check your email to verify.', 'success');
      } else {
        showToast('Account created successfully! Welcome to MarketMind.', 'success');
        navigate('/');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Please check your details.';
      setErrorMsg(msg);
      showToast(`Registration failed: ${msg}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToLogin = () => {
    navigate('/login', {
      state: {
        email: registeredEmail,
        message: 'A verification link has been sent to your email. Please verify before signing in.',
      },
    });
  };

  return (
    <div className="max-w-[420px] mx-auto pt-10 pb-20">
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
            Open Analyst Account
          </h1>
          <p className="text-xs text-slate-500 mt-1">Get immediate terminal access</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Field
            id="fullName"
            label="Full Name"
            value={fullName}
            onChange={setFullName}
            placeholder="e.g. Rahul Sharma"
            autoComplete="name"
          />
          <Field
            id="email"
            label="Email Address"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="analyst@fund.in"
            autoComplete="email"
          />
          <Field
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
          />
          <Field
            id="confirmPassword"
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
          />

          {errorMsg && (
            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-xl mb-4">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 py-3 px-4 rounded-xl text-sm font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 mt-2 hover:shadow-sm active:scale-98"
          >
            {isLoading ? 'Creating account…' : 'Register Free Account →'}
          </button>
        </form>

        <div className="flex items-center justify-between text-xs text-slate-500 mt-6 pt-5 border-t border-slate-100">
          <Link to="/login" className="hover:text-slate-900 font-semibold underline">
            Already have an account? Sign in
          </Link>
          <Link to="/" className="hover:text-slate-900 font-medium">
            ← Home
          </Link>
        </div>
      </div>

      {/* Email Verification Pop-up Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 text-center relative">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>

            <h2 className="text-xl font-black text-slate-900 tracking-tight mb-2">
              Verify Your Email Address
            </h2>

            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              We have sent a verification email to <span className="font-bold text-slate-900">{registeredEmail}</span>.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 text-left mb-6 leading-relaxed">
              <p className="font-bold mb-1.5">Action required before signing in:</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-700">
                <li>Open your email inbox (and check spam/junk).</li>
                <li>Click the confirmation link sent by Supabase.</li>
                <li>Return to MarketMind and sign in with your credentials.</li>
              </ol>
            </div>

            <button
              type="button"
              onClick={handleGoToLogin}
              className="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 py-3.5 px-4 rounded-xl text-sm font-bold shadow-xs transition-all cursor-pointer hover:shadow-sm active:scale-98"
            >
              Go to Sign In Page →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
