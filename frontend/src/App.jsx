import React, { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import ColdStartBanner from './components/ColdStartBanner';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import Skeleton from './components/ui/Skeleton';
import api from './api/client';

// Route-level code splitting with React.lazy
const LandingPage = lazy(() => import('./pages/LandingPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ChaosLabPage = lazy(() => import('./pages/ChaosLabPage'));
const ComparePage = lazy(() => import('./pages/ComparePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function PageLoadingFallback() {
  return (
    <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Skeleton variant="rect" height="60px" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <Skeleton variant="rect" height="100px" />
        <Skeleton variant="rect" height="100px" />
        <Skeleton variant="rect" height="100px" />
      </div>
      <Skeleton variant="rect" height="320px" />
    </div>
  );
}

export default function App() {
  const [healthStatus, setHealthStatus] = useState('CHECKING');
  const [showColdStart, setShowColdStart] = useState(false);
  const initialCheckComplete = useRef(false);

  useEffect(() => {
    let isMounted = true;
    const start = Date.now();

    const checkHealth = async () => {
      try {
        const res = await api.wakeSystem();
        if (!isMounted) return;

        if (res && res.paymentService === 'UP' && res.mockBank === 'UP') {
          setHealthStatus('UP');
          setShowColdStart(false);
        } else {
          setHealthStatus('DEGRADED');
          setShowColdStart(true);
        }
      } catch (err) {
        if (!isMounted) return;

        // Fallback to standard actuator check
        try {
          const basicRes = await api.getHealth();
          if (basicRes && basicRes.status === 'UP') {
            setHealthStatus('UP');
            setShowColdStart(false);
          } else {
            setHealthStatus('DOWN');
            setShowColdStart(true);
          }
        } catch {
          setHealthStatus('DOWN');
          setShowColdStart(true);
        }
      } finally {
        if (!initialCheckComplete.current) {
          initialCheckComplete.current = true;
          const elapsed = Date.now() - start;
          if (elapsed > 3000) {
            setShowColdStart(true);
          }
        }
      }
    };

    checkHealth();

    const coldTimer = setTimeout(() => {
      if (healthStatus !== 'UP') {
        setShowColdStart(true);
      }
    }, 3000);

    const interval = setInterval(checkHealth, 10000);

    return () => {
      isMounted = false;
      clearTimeout(coldTimer);
      clearInterval(interval);
    };
  }, []);

  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <div className="app-root">
            <ColdStartBanner
              visible={showColdStart}
              onDismiss={() => setShowColdStart(false)}
            />
            <AppShell healthStatus={healthStatus}>
              <Suspense fallback={<PageLoadingFallback />}>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/lab" element={<ChaosLabPage />} />
                  <Route path="/compare/:id" element={<ComparePage />} />
                  <Route path="/compare" element={<ComparePage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </AppShell>
          </div>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
