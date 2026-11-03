import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Clock,
  Info,
  Wifi,
  WifiOff,
  Battery,
  ShieldCheck,
  Download,
  X,
  ExternalLink
} from 'lucide-react';

export default function MobileShell() {
  const location = useLocation();
  const navigate = useNavigate();

  const [currentTime, setCurrentTime] = useState('09:41');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // Status bar clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Online / Offline listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // PWA Install prompt listener
  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  const navTabs = [
    { label: 'Pay', path: '/app', exact: true, icon: CreditCard },
    { label: 'Activity', path: '/app/activity', icon: Clock },
    { label: 'About', path: '/app/about', icon: Info }
  ];

  const isTabActive = (tab) => {
    if (tab.exact) return location.pathname === '/app' || location.pathname === '/app/pay';
    return location.pathname.startsWith(tab.path);
  };

  return (
    <div className="mobile-app-wrapper" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-root)',
      padding: '20px 0'
    }}>
      {/* Phone Frame for Desktop / Full Screen on Mobile */}
      <div className="mobile-phone-device" style={{
        width: '100%',
        maxWidth: '390px',
        height: '844px',
        maxHeight: '100vh',
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-phone, 44px)',
        boxShadow: '0 25px 60px -15px rgba(0,0,0,0.3), 0 0 0 10px rgba(255,255,255,0.04), 0 0 0 1px var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Offline Banner */}
        <AnimatePresence>
          {!isOnline && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{
                background: 'var(--status-retrying-bg)',
                color: 'var(--status-retrying-text)',
                padding: '6px 16px',
                fontSize: '11px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                borderBottom: '1px solid var(--status-retrying-border)',
                zIndex: 60
              }}
            >
              <WifiOff size={12} />
              <span>Offline mode • Showing cached transactions</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PWA Add to Home Screen Banner */}
        <AnimatePresence>
          {showInstallBanner && (
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              style={{
                background: 'var(--color-brand-surface)',
                color: 'var(--text-primary)',
                padding: '8px 14px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--color-brand-border)',
                zIndex: 60
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Download size={14} color="var(--color-brand-accent)" />
                <span>Install ReliablePay App</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={handleInstallClick}
                  style={{
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '4px',
                    background: 'var(--color-brand-primary)',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Install
                </button>
                <button
                  onClick={() => setShowInstallBanner(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Status Bar */}
        <div className="mobile-status-bar" style={{
          height: '44px',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          flexShrink: 0,
          zIndex: 50,
          userSelect: 'none'
        }}>
          <span>{currentTime}</span>

          {/* Dynamic Notch / Island indicator */}
          <div style={{
            width: '90px',
            height: '24px',
            background: 'var(--bg-root)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}>
            <ShieldCheck size={12} color="var(--color-brand-accent)" />
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>Citi Engine</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} color="var(--color-error-500)" />}
            <Battery size={16} />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="mobile-viewport-content" style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          padding: '0 16px 16px'
        }}>
          <Outlet />
        </div>

        {/* Bottom Tab Bar (Safe-area aware, 44px touch targets) */}
        <nav className="mobile-tab-bar" style={{
          height: '64px',
          paddingBottom: 'env(safe-area-inset-bottom, 8px)',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface-elevated)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          flexShrink: 0,
          zIndex: 50
        }}>
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const active = isTabActive(tab);
            return (
              <Link
                key={tab.path}
                to={tab.path}
                style={{
                  flex: 1,
                  height: '100%',
                  minWidth: '44px',
                  minHeight: '44px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  textDecoration: 'none',
                  color: active ? 'var(--color-brand-primary)' : 'var(--text-muted)',
                  fontSize: '11px',
                  fontWeight: active ? 600 : 500,
                  transition: 'color 0.15s ease'
                }}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
