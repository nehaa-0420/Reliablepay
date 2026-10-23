import React, { useEffect, useState, useRef } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ColdStartBanner from './components/ColdStartBanner';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import ChaosLabPage from './pages/ChaosLabPage';
import ComparePage from './pages/ComparePage';
import NotFoundPage from './pages/NotFoundPage';
import api from './api/client';

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

    // First check
    checkHealth();

    // Set a timer to check if it's taking >3s
    const coldTimer = setTimeout(() => {
      if (healthStatus !== 'UP') {
        setShowColdStart(true);
      }
    }, 3000);

    // Periodic check every 10s
    const interval = setInterval(checkHealth, 10000);

    return () => {
      isMounted = false;
      clearTimeout(coldTimer);
      clearInterval(interval);
    };
  }, []);

  return (
    <BrowserRouter>
      <div className="app-layout">
        <Navbar healthStatus={healthStatus} />
        <ColdStartBanner
          visible={showColdStart}
          onDismiss={() => setShowColdStart(false)}
        />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/lab" element={<ChaosLabPage />} />
            <Route path="/compare/:id" element={<ComparePage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
