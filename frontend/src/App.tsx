import React, { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Tour } from './components/Tour';
import { ToastProvider } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { Banner } from './components/Banner';
import { getCapabilitiesApi } from './api/capabilities';
import { applyAppTheme, getStoredTheme } from './theme/themeManager';

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
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
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

  // Ensure theme is strictly applied on mount and synchronized
  useEffect(() => {
    applyAppTheme(getStoredTheme());
  }, []);

  const [isSidebarPinned, setIsSidebarPinned] = useState<boolean>(() => {
    try {
      return localStorage.getItem('mm_sidebar_pinned') === 'true';
    } catch {
      return false;
    }
  });

  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(isSidebarPinned);

  const isEngineEnabled = capabilities?.engine?.enabled ?? true;

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <Banner engine={capabilities?.engine} />

      {/* Modern Collapsible & Pinnable Sidebar Navigation */}
      <Sidebar
        capabilities={capabilities}
        isPinned={isSidebarPinned}
        onPinChange={(pinned) => {
          setIsSidebarPinned(pinned);
          setIsSidebarExpanded(pinned);
        }}
        onExpandedChange={setIsSidebarExpanded}
      />

      {/* Main Content Area with responsive transition padding for sidebar */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          isSidebarExpanded ? 'pl-64' : 'pl-16'
        }`}
      >
        <div className="wrap max-w-[1360px] mx-auto w-full px-4 sm:px-6 lg:px-8 flex-1 flex flex-col">
          <TopBar capabilities={capabilities} showNav={false} />

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
                <Route path="/profile" element={<AuthGuard><ProfilePage /></AuthGuard>} />

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
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
