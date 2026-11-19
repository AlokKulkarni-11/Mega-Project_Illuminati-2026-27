import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { getMeApi, loginApi, registerApi, logoutApi, updateProfileNameApi, updatePasswordApi } from '../api/auth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name?: string) => Promise<{ needsEmailVerification: boolean }>;
  logout: () => void;
  updateName: (fullName: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('marketmind_token'));
  const [user, setUser] = useState<User | null>(() => {
    const savedToken = localStorage.getItem('marketmind_token');
    if (!savedToken) return null;
    const saved = localStorage.getItem('marketmind_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // 100% Supabase Auth lifecycle management in browser / dev / prod
    if (isSupabaseConfigured && import.meta.env.MODE !== 'test') {
      // Check existing session
      supabase.auth.getSession().then(({ data: { session } }) => {
        const isConfirmed = Boolean(
          session?.user?.email_confirmed_at ||
          (session?.user as any)?.confirmed_at
        );
        if (session?.user && session?.access_token && isConfirmed) {
          const u: User = {
            id: session.user.id,
            email: session.user.email || '',
            fullName:
              session.user.user_metadata?.full_name ||
              session.user.user_metadata?.fullName ||
              session.user.email?.split('@')[0] ||
              'User',
            createdAt: session.user.created_at || new Date().toISOString(),
          };
          setUser(u);
          setToken(session.access_token);
          localStorage.setItem('marketmind_token', session.access_token);
          localStorage.setItem('marketmind_user', JSON.stringify(u));
        } else {
          setUser(null);
          setToken(null);
          localStorage.removeItem('marketmind_token');
          localStorage.removeItem('marketmind_user');
          if (session && !isConfirmed) {
            supabase.auth.signOut().catch(() => {});
          }
        }
        setIsLoading(false);
      }).catch(() => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('marketmind_token');
        localStorage.removeItem('marketmind_user');
        setIsLoading(false);
      });

      // Listen to real-time Supabase auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        const isConfirmed = Boolean(
          session?.user?.email_confirmed_at ||
          (session?.user as any)?.confirmed_at
        );
        if (session?.user && session?.access_token && isConfirmed) {
          const u: User = {
            id: session.user.id,
            email: session.user.email || '',
            fullName:
              session.user.user_metadata?.full_name ||
              session.user.user_metadata?.fullName ||
              session.user.email?.split('@')[0] ||
              'User',
            createdAt: session.user.created_at || new Date().toISOString(),
          };
          setUser(u);
          setToken(session.access_token);
          localStorage.setItem('marketmind_token', session.access_token);
          localStorage.setItem('marketmind_user', JSON.stringify(u));
        } else {
          setUser(null);
          setToken(null);
          localStorage.removeItem('marketmind_token');
          localStorage.removeItem('marketmind_user');
        }
        setIsLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      // In test or non-configured environment, check stored token via getMeApi
      const initAuth = async () => {
        const storedToken = localStorage.getItem('marketmind_token');
        if (storedToken) {
          try {
            const profile = await getMeApi();
            setUser(profile);
            localStorage.setItem('marketmind_user', JSON.stringify(profile));
          } catch {
            localStorage.removeItem('marketmind_token');
            localStorage.removeItem('marketmind_user');
            setToken(null);
            setUser(null);
          }
        }
        setIsLoading(false);
      };

      initAuth();
    }
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await loginApi(email, pass);
    localStorage.setItem('marketmind_token', res.token);
    localStorage.setItem('marketmind_user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
  };

  const register = async (email: string, pass: string, name?: string): Promise<{ needsEmailVerification: boolean }> => {
    const res = await registerApi(email, pass, name);
    if (!res.needsEmailVerification && res.token && res.user) {
      localStorage.setItem('marketmind_token', res.token);
      localStorage.setItem('marketmind_user', JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
      return { needsEmailVerification: false };
    } else {
      // Email verification required before login: clear any session and do not mark as signed in
      localStorage.removeItem('marketmind_token');
      localStorage.removeItem('marketmind_user');
      setToken(null);
      setUser(null);
      if (isSupabaseConfigured) {
        await supabase.auth.signOut().catch(() => {});
      }
      return { needsEmailVerification: true };
    }
  };

  const logout = () => {
    logoutApi().catch(() => {});
    localStorage.removeItem('marketmind_token');
    localStorage.removeItem('marketmind_user');
    setToken(null);
    setUser(null);
  };

  const updateName = async (fullName: string) => {
    const updated = await updateProfileNameApi(fullName);
    setUser(updated);
    localStorage.setItem('marketmind_user', JSON.stringify(updated));
  };

  const updatePassword = async (newPassword: string) => {
    await updatePasswordApi(newPassword);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, updateName, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
