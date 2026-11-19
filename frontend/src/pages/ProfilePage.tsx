import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

export const ProfilePage: React.FC = () => {
  const { user, updateName, updatePassword, logout } = useAuth();
  const { showToast } = useToast();

  // Name form state
  const [nameInput, setNameInput] = useState<string>(user?.fullName || '');
  const [isUpdatingName, setIsUpdatingName] = useState<boolean>(false);

  // Password form state
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      showToast('Name cannot be empty.', 'error');
      return;
    }
    setIsUpdatingName(true);
    try {
      await updateName(nameInput.trim());
      showToast('Profile name updated successfully.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update name.';
      showToast(msg, 'error');
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!newPassword) {
      setPasswordError('Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match. Please verify.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await updatePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password changed successfully.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update password.';
      setPasswordError(msg);
      showToast(msg, 'error');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const memberSinceFormatted = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Active Member';

  const userInitial = (user?.fullName || user?.email || 'A').charAt(0).toUpperCase();

  return (
    <div className="pt-6 pb-20 max-w-3xl mx-auto">
      {/* Breadcrumb Header */}
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">
            <Link to="/settings" className="hover:underline">Settings</Link>
            <span>/</span>
            <span>Account Profile</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Analyst Profile & Security
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Manage your personal identity, credentials, and authentication settings.
          </p>
        </div>

        <Link
          to="/settings"
          className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3.5 py-2 rounded-xl transition-all shadow-xs"
        >
          ← Back to Settings
        </Link>
      </div>

      {/* 1. Identity Overview Card */}
      <div className="calc-card border rounded-3xl p-6 sm:p-8 mb-8 shadow-xs">
        <div className="flex items-center gap-5 flex-wrap">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 font-black text-2xl flex items-center justify-center shrink-0 border border-amber-300/40">
            {userInitial}
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                {user?.fullName || 'Research Analyst'}
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full">
                ● Active Analyst
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-mono">
              {user?.email}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Member Since
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {memberSinceFormatted}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Authentication Provider
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Supabase Auth Cloud
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              User ID
            </span>
            <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400 truncate block">
              {user?.id || '—'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 2. Change Full Name Form */}
        <div className="calc-card border rounded-3xl p-6 sm:p-7 shadow-xs">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              👤
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Personal Name
              </h3>
              <p className="text-xs text-slate-500">Update how your name appears on reports</p>
            </div>
          </div>

          <form onSubmit={handleUpdateName} className="space-y-4">
            <div>
              <label htmlFor="fullNameInput" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                id="fullNameInput"
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="e.g. Alok Kulkarni"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-500 cursor-not-allowed"
                title="Email is managed via Supabase credentials"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Primary login email (verified)
              </span>
            </div>

            <button
              type="submit"
              disabled={isUpdatingName}
              className="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-xs active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {isUpdatingName ? 'Updating Name…' : 'Save Name Changes'}
            </button>
          </form>
        </div>

        {/* 3. Change Password Form */}
        <div className="calc-card border rounded-3xl p-6 sm:p-7 shadow-xs">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              🔒
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Change Password
              </h3>
              <p className="text-xs text-slate-500">Update your account login password</p>
            </div>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label htmlFor="newPasswordInput" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <input
                id="newPasswordInput"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
            </div>

            <div>
              <label htmlFor="confirmPasswordInput" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Confirm New Password
              </label>
              <input
                id="confirmPasswordInput"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                autoComplete="new-password"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
            </div>

            {passwordError && (
              <div className="text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 p-2.5 rounded-xl">
                {passwordError}
              </div>
            )}

            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-amber-400 dark:hover:bg-amber-500 text-white dark:text-slate-950 font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-xs active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {isUpdatingPassword ? 'Updating Password…' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>

      {/* 4. Terminal Session Controls */}
      <div className="mt-8 p-6 rounded-3xl calc-card border flex items-center justify-between flex-wrap gap-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Current Terminal Session
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Signed in with active JSON Web Token authentication.
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="text-xs font-bold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 border border-rose-300 dark:border-rose-800 py-2 px-4 rounded-xl transition-all cursor-pointer shadow-xs active:scale-98"
        >
          Sign Out of Terminal
        </button>
      </div>
    </div>
  );
};
