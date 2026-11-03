import React, { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import ColdStartBanner from './components/ColdStartBanner';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AdminAuthProvider, ProtectedAdminRoute } from './context/AdminAuthContext';
import Skeleton from './components/ui/Skeleton';
import api from './api/client';

// Route-level code splitting with React.lazy
const LandingPage = lazy(() => import('./pages/LandingPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ChaosLabPage = lazy(() => import('./pages/ChaosLabPage'));
const ComparePage = lazy(() => import('./pages/ComparePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Mobile PWA App routes
const MobileShell = lazy(() => import('./components/mobile/MobileShell'));
const MobilePayPage = lazy(() => import('./pages/mobile/MobilePayPage'));
const MobileProgressPage = lazy(() => import('./pages/mobile/MobileProgressPage'));
const MobileActivityPage = lazy(() => import('./pages/mobile/MobileActivityPage'));
const MobileAboutPage = lazy(() => import('./pages/mobile/MobileAboutPage'));

// Admin Console routes
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'));
const AdminLayout = lazy(() => import('./components/layout/AdminLayout'));
const AdminLiveMonitorPage = lazy(() => import('./pages/admin/AdminLiveMonitorPage'));
const AdminSystemPage = lazy(() => import('./pages/admin/AdminSystemPage'));

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

function CompareRedirect() {
  const { id } = useParams();
  return <Navigate to={id ? `/admin/compare/${id}` : '/admin/compare'} replace />;
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
          <AdminAuthProvider>
            <div className="app-root">
              <ColdStartBanner
                visible={showColdStart}
                onDismiss={() => setShowColdStart(false)}
              />
              <AppShell healthStatus={healthStatus}>
                <Suspense fallback={<PageLoadingFallback />}>
                  <Routes>
                    {/* Landing Page */}
                    <Route path="/" element={<LandingPage />} />

                    {/* Backward-compatible redirects from old URLs to /admin */}
                    <Route path="/dashboard" element={<Navigate to="/admin/payments" replace />} />
                    <Route path="/lab" element={<Navigate to="/admin/lab" replace />} />
                    <Route path="/compare/:id" element={<CompareRedirect />} />
                    <Route path="/compare" element={<Navigate to="/admin/compare" replace />} />

                    {/* Customer Mobile App (/app/*) */}
                    <Route path="/app" element={<MobileShell />}>
                      <Route index element={<MobilePayPage />} />
                      <Route path="pay" element={<MobilePayPage />} />
                      <Route path="progress/:id" element={<MobileProgressPage />} />
                      <Route path="activity" element={<MobileActivityPage />} />
                      <Route path="about" element={<MobileAboutPage />} />
                    </Route>

                    {/* Admin Authentication */}
                    <Route path="/admin/login" element={<AdminLoginPage />} />

                    {/* Protected Admin Console (/admin/*) */}
                    <Route
                      path="/admin"
                      element={
                        <ProtectedAdminRoute>
                          <AdminLayout />
                        </ProtectedAdminRoute>
                      }
                    >
                      <Route index element={<AdminLiveMonitorPage />} />
                      <Route path="live" element={<AdminLiveMonitorPage />} />
                      <Route path="payments" element={<DashboardPage />} />
                      <Route path="lab" element={<ChaosLabPage />} />
                      <Route path="compare" element={<ComparePage />} />
                      <Route path="compare/:id" element={<ComparePage />} />
                      <Route path="system" element={<AdminSystemPage />} />
                    </Route>

                    {/* Catch all 404 */}
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </Suspense>
              </AppShell>
            </div>
          </AdminAuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
