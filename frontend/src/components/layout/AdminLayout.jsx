import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radio,
  Layers,
  FlaskConical,
  GitCompare,
  Server,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  ShieldCheck,
  Smartphone,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useTheme } from '../../context/ThemeContext';
import Tooltip from '../ui/Tooltip';
import api from '../../api/client';

export default function AdminLayout({ streamStatus = 'LIVE' }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, username } = useAdminAuth();
  const { theme, toggleTheme, isDark } = useTheme();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [healthStatus, setHealthStatus] = useState('CHECKING');
  const [lastChecked, setLastChecked] = useState(new Date());

  // Periodically check health
  useEffect(() => {
    let isMounted = true;
    const pollHealth = async () => {
      try {
        const res = await api.wakeSystem();
        if (!isMounted) return;
        if (res && res.paymentService === 'UP') {
          setHealthStatus('UP');
        } else {
          setHealthStatus('DEGRADED');
        }
      } catch {
        if (!isMounted) return;
        setHealthStatus('DOWN');
      } finally {
        if (isMounted) setLastChecked(new Date());
      }
    };

    pollHealth();
    const interval = setInterval(pollHealth, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Close sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const navItems = [
    { label: 'Live Monitor', path: '/admin', exact: true, icon: Radio, badge: 'Live' },
    { label: 'Payments', path: '/admin/payments', icon: Layers },
    { label: 'Chaos Lab', path: '/admin/lab', icon: FlaskConical },
    { label: 'Experiments & Compare', path: '/admin/compare', icon: GitCompare },
    { label: 'System & Config', path: '/admin/system', icon: Server }
  ];

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path || location.pathname === '/admin/live';
    return location.pathname.startsWith(item.path);
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="admin-console-root" style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-root)' }}>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 90
            }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'is-open' : ''}`} style={{
        width: '260px',
        borderRight: '1px solid var(--border-subtle)',
        background: 'var(--bg-surface)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
        flexShrink: 0
      }}>
        {/* Brand */}
        <div style={{
          height: '64px',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-accent))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <ShieldCheck size={18} strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.2 }}>
                ReliablePay
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-brand-accent)', fontWeight: 600 }}>
                Admin Console
              </div>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="mobile-only-btn"
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav style={{ padding: '16px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 12px 4px' }}>
            Operations
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: active ? 600 : 500,
                  color: active ? 'var(--color-brand-primary)' : 'var(--text-secondary)',
                  background: active ? 'var(--color-brand-surface)' : 'transparent',
                  border: active ? '1px solid var(--color-brand-border)' : '1px solid transparent',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    background: 'var(--status-processing-bg)',
                    color: 'var(--status-processing-text)',
                    border: '1px solid var(--status-processing-border)'
                  }}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '16px 12px 4px' }}>
            External Views
          </div>
          <Link
            to="/app"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              fontSize: '13px',
              color: 'var(--text-secondary)'
            }}
          >
            <Smartphone size={16} />
            <span style={{ flex: 1 }}>Customer App</span>
            <ExternalLink size={14} style={{ opacity: 0.6 }} />
          </Link>
          <a
            href="http://localhost:8080/swagger-ui/index.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              fontSize: '13px',
              color: 'var(--text-secondary)'
            }}
          >
            <Server size={16} />
            <span style={{ flex: 1 }}>Swagger API Docs</span>
            <ExternalLink size={14} style={{ opacity: 0.6 }} />
          </a>
        </nav>

        {/* User Session & Logout */}
        <div style={{
          padding: '16px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-surface-elevated)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--color-brand-surface)',
              color: 'var(--color-brand-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '13px'
            }}>
              A
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {username || 'Administrator'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Session Active
              </div>
            </div>
          </div>

          <Tooltip content="Sign out of console" position="top">
            <button
              onClick={handleLogout}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <LogOut size={16} />
            </button>
          </Tooltip>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'hidden' }}>
        {/* Top bar */}
        <header style={{
          height: '64px',
          padding: '0 24px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 80
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => setSidebarOpen(true)}
              className="mobile-only-btn"
              style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px' }}
            >
              <Menu size={20} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
              <span>Console</span>
              <ChevronRight size={14} />
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {navItems.find(i => isActive(i))?.label || 'Overview'}
              </span>
            </div>
          </div>

          {/* Right Topbar Indicators */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Live SSE Stream indicator */}
            <Tooltip content="Real-time event push stream connected via Server-Sent Events" position="bottom">
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: '20px',
                background: streamStatus === 'LIVE' ? 'var(--status-success-bg)' : streamStatus === 'RECONNECTING' ? 'var(--status-retrying-bg)' : 'var(--status-failed-bg)',
                color: streamStatus === 'LIVE' ? 'var(--status-success-text)' : streamStatus === 'RECONNECTING' ? 'var(--status-retrying-text)' : 'var(--status-failed-text)',
                border: `1px solid ${streamStatus === 'LIVE' ? 'var(--status-success-border)' : streamStatus === 'RECONNECTING' ? 'var(--status-retrying-border)' : 'var(--status-failed-border)'}`
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: streamStatus === 'LIVE' ? 'var(--color-success-500)' : streamStatus === 'RECONNECTING' ? 'var(--color-warning-500)' : 'var(--color-error-500)',
                  animation: streamStatus === 'LIVE' ? 'pulse 2s infinite' : 'none'
                }} />
                <span>{streamStatus === 'LIVE' ? 'SSE Stream Live' : streamStatus === 'RECONNECTING' ? 'Reconnecting' : 'Stream Offline'}</span>
              </div>
            </Tooltip>

            {/* Service Health Pill */}
            <Tooltip content={`Engine: ${healthStatus} • Last checked: ${lastChecked.toLocaleTimeString()}`} position="bottom">
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: '20px',
                background: 'var(--bg-surface-elevated)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)'
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: healthStatus === 'UP' ? 'var(--color-success-500)' : 'var(--color-error-500)'
                }} />
                <span>Engine {healthStatus === 'UP' ? 'UP' : 'DOWN'}</span>
              </div>
            </Tooltip>

            {/* Theme Toggle */}
            <Tooltip content={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'} position="bottom">
              <button
                onClick={toggleTheme}
                style={{
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </Tooltip>
          </div>
        </header>

        {/* Content Outlet */}
        <main style={{ flex: 1, padding: '24px', maxWidth: '1600px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
