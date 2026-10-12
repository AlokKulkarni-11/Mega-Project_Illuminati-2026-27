import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { getMeApi, loginApi, registerApi } from '../api/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('marketmind_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('marketmind_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
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
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await loginApi(email, pass);
    localStorage.setItem('marketmind_token', res.token);
    localStorage.setItem('marketmind_user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
  };

  const register = async (email: string, pass: string, name?: string) => {
    const res = await registerApi(email, pass, name);
    localStorage.setItem('marketmind_token', res.token);
    localStorage.setItem('marketmind_user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem('marketmind_token');
    localStorage.removeItem('marketmind_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
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
