import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Tour } from './components/Tour';
import { ToastProvider } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TopBar } from './components/TopBar';
import { Banner } from './components/Banner';
import { getCapabilitiesApi } from './api/capabilities';

// Lazy loaded page components
const ResearchDeskPage = lazy(() => import('./pages/ResearchDeskPage').then(m => ({ default: m.ResearchDeskPage })));
const PulsePage = lazy(() => import('./pages/PulsePage').then(m => ({ default: m.PulsePage })));
const ComparisonPage = lazy(() => import('./pages/ComparisonPage').then(m => ({ default: m.ComparisonPage })));
const DailyDigestPage = lazy(() => import('./pages/DailyDigestPage').then(m => ({ default: m.DailyDigestPage })));
const WatchlistPage = lazy(() => import('./pages/WatchlistPage').then(m => ({ default: m.WatchlistPage })));
const CalculatorsPage = lazy(() => import('./pages/CalculatorsPage').then(m => ({ default: m.CalculatorsPage })));
const GlossaryPage = lazy(() => import('./pages/GlossaryPage').then(m => ({ default: m.GlossaryPage })));
const HistoryPage = lazy(() => import('./pages/HistoryPage').then(m => ({ default: m.HistoryPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});

const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isLoading } = useAuth();
  if (isLoading) {
    return <div className="py-20 text-center text-xs italic text-ink-soft">Reviewing the case file…</div>;
  }
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const Home: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isLoading } = useAuth();
  if (isLoading) return null;
  return token ? <>{children}</> : <LandingPage />;
};

const AppContent: React.FC = () => {
  const { token } = useAuth();
  const { data: capabilities } = useQuery({
    queryKey: ['capabilities'],
    queryFn: getCapabilitiesApi,
  });

  const isEngineEnabled = capabilities?.engine?.enabled ?? true;

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <Banner engine={capabilities?.engine} />
      <div className="wrap max-w-desk mx-auto w-full flex-1 flex flex-col">
        <TopBar capabilities={capabilities} showNav={!!token} />

        <main className="flex-1 pb-16">
          <ErrorBoundary>
            <Suspense fallback={<div className="py-20 text-center text-xs italic text-ink-soft">Reviewing the case file…</div>}>
              <Routes>
                {/* Public Auth Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Core Engine Routes (gated by capabilities) */}
                {isEngineEnabled ? (
                  <>
                    <Route path="/" element={<Home><ResearchDeskPage /></Home>} />
                    <Route path="/pulse" element={<AuthGuard><PulsePage /></AuthGuard>} />
                    <Route path="/compare" element={<AuthGuard><ComparisonPage /></AuthGuard>} />
                    <Route path="/digest" element={<AuthGuard><DailyDigestPage /></AuthGuard>} />
                  </>
                ) : (
                  <Route path="/" element={<Home><CalculatorsPage /></Home>} />
                )}

                {/* Engine-Independent Routes */}
                <Route path="/watchlist" element={<AuthGuard><WatchlistPage capabilities={capabilities} /></AuthGuard>} />
                <Route path="/calculators" element={<AuthGuard><CalculatorsPage /></AuthGuard>} />
                <Route path="/glossary" element={<AuthGuard><GlossaryPage /></AuthGuard>} />
                <Route path="/history" element={<AuthGuard><HistoryPage /></AuthGuard>} />
                <Route path="/settings" element={<AuthGuard><SettingsPage /></AuthGuard>} />

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      <Tour />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
