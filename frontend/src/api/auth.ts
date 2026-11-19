import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AuthResponse, User } from '../types';

/**
 * 100% Pure Supabase Authentication Service
 * ZERO local backend fallback.
 */

const assertSupabaseConfigured = () => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase Auth is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your frontend/.env file.');
  }
};

export const loginApi = async (email: string, password: string): Promise<AuthResponse> => {
  assertSupabaseConfigured();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(error.message || 'Failed to login with Supabase.');
  }

  const sbUser = data.user;
  if (!sbUser) {
    throw new Error('Failed to login: No user returned by Supabase.');
  }

  const user: User = {
    id: sbUser.id,
    email: sbUser.email || email,
    fullName:
      sbUser.user_metadata?.full_name ||
      sbUser.user_metadata?.fullName ||
      email.split('@')[0],
    createdAt: sbUser.created_at || new Date().toISOString(),
  };

  return {
    token: data.session?.access_token || '',
    tokenType: 'Bearer',
    expiresInMs: (data.session?.expires_in || 3600) * 1000,
    user,
  };
};

export const registerApi = async (email: string, password: string, fullName?: string): Promise<AuthResponse> => {
  assertSupabaseConfigured();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || '',
        fullName: fullName || '',
      },
    },
  });

  if (error) {
    throw new Error(error.message || 'Failed to register with Supabase.');
  }

  const sbUser = data.user;
  if (!sbUser) {
    throw new Error('Registration failed: No user returned by Supabase.');
  }

  const user: User = {
    id: sbUser.id,
    email: sbUser.email || email,
    fullName: fullName || sbUser.user_metadata?.full_name || email.split('@')[0],
    createdAt: sbUser.created_at || new Date().toISOString(),
  };

  const isConfirmed = Boolean(sbUser.email_confirmed_at || (sbUser as any).confirmed_at);

  return {
    token: isConfirmed ? (data.session?.access_token || '') : '',
    tokenType: 'Bearer',
    expiresInMs: (data.session?.expires_in || 3600) * 1000,
    user: isConfirmed ? user : null,
    needsEmailVerification: !isConfirmed,
  };
};

export const logoutApi = async (): Promise<void> => {
  if (isSupabaseConfigured) {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Supabase sign-out error:', error.message);
    }
  }
};

export const getMeApi = async (): Promise<User> => {
  assertSupabaseConfigured();

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error(error?.message || 'Not authenticated with Supabase.');
  }

  return {
    id: user.id,
    email: user.email || '',
    fullName:
      user.user_metadata?.full_name ||
      user.user_metadata?.fullName ||
      user.email?.split('@')[0] ||
      'User',
    createdAt: user.created_at || new Date().toISOString(),
  };
};

export const updateProfileNameApi = async (fullName: string): Promise<User> => {
  assertSupabaseConfigured();

  const { data: { user }, error } = await supabase.auth.updateUser({
    data: {
      full_name: fullName,
      fullName: fullName,
    },
  });

  if (error || !user) {
    throw new Error(error?.message || 'Failed to update profile name.');
  }

  return {
    id: user.id,
    email: user.email || '',
    fullName:
      user.user_metadata?.full_name ||
      user.user_metadata?.fullName ||
      fullName,
    createdAt: user.created_at || new Date().toISOString(),
  };
};

export const updatePasswordApi = async (newPassword: string): Promise<void> => {
  assertSupabaseConfigured();

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw new Error(error.message || 'Failed to update password.');
  }
};
