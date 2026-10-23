import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FlaskConical,
  GitCompare,
  ShieldCheck,
  Sun,
  Moon,
  Menu,
  X,
  ExternalLink,
  ChevronRight,
  Activity,
  Server
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import Tooltip from '../ui/Tooltip';

export default function AppShell({ children, healthStatus = 'UP' }) {
  const location = useLocation();
  const { theme, toggleTheme, isDark } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [lastChecked, setLastChecked] = useState(new Date());

  const isLanding = location.pathname === '/';

  // Update lastChecked timestamp when healthStatus changes
  useEffect(() => {
    setLastChecked(new Date());
  }, [healthStatus]);

  // Handle scroll for landing navbar blur
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navItems = [
    { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Chaos Lab', path: '/lab', icon: FlaskConical },
    { label: 'Protocol Compare', path: '/compare', icon: GitCompare }
  ];

  const getBreadcrumbTitle = () => {
    if (location.pathname === '/dashboard') return 'Dashboard';
    if (location.pathname === '/lab') return 'Chaos Engineering Lab';
    if (location.pathname.startsWith('/compare')) return 'Protocol Comparison';
    return '';
  };

  const getStatusLabel = () => {
    if (healthStatus === 'UP') return 'Engine Online';
    if (healthStatus === 'DEGRADED') return 'Degraded';
    if (healthStatus === 'DOWN') return 'Offline';
    return 'Checking...';
  };

  // Status Pill with Tooltip
  const renderStatusPill = () => (
    <Tooltip
      content={`Backend: ${healthStatus} • Last checked: ${lastChecked.toLocaleTimeString()}`}
      position="bottom"
    >
      <div className={`status-pill status-pill-${healthStatus}`}>
        <span className="status-pill-dot" />
        <span>{getStatusLabel()}</span>
      </div>
    </Tooltip>
  );

  // If on Landing Page, render Landing top navigation
  if (isLanding) {
    return (
      <div className="landing-layout">
        <header className={`landing-navbar ${isScrolled ? 'is-scrolled' : ''}`}>
          <Link to="/" className="brand-badge">
            <div className="brand-icon-shield">
              <ShieldCheck size={18} strokeWidth={2.5} />
            </div>
            <span>ReliablePay</span>
            <span className="brand-version">Engine</span>
          </Link>

          <nav className="landing-nav-links">
            <Link to="/dashboard" className="landing-nav-link">Dashboard</Link>
            <Link to="/lab" className="landing-nav-link">Chaos Lab</Link>
            <Link to="/compare" className="landing-nav-link">Compare</Link>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {renderStatusPill()}
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link to="/dashboard" className="btn btn-primary btn-sm">
              Open Dashboard →
            </Link>
          </div>
        </header>

        <main>{children}</main>
      </div>
    );
  }

  // Dashboard / Lab / Compare Shell Layout
  return (
    <div className="shell-layout">
      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="ui-modal-backdrop"
            style={{ zIndex: 45 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`shell-sidebar ${mobileMenuOpen ? 'is-open' : ''}`}>
        <div className="shell-sidebar-header">
          <Link to="/" className="brand-badge">
            <div className="brand-icon-shield">
              <ShieldCheck size={18} strokeWidth={2.5} />
            </div>
            <span>ReliablePay</span>
            <span className="brand-version">Citi Brief</span>
          </Link>
          <button
            type="button"
            className="theme-toggle-btn d-md-none"
            style={{ display: mobileMenuOpen ? 'flex' : 'none' }}
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="shell-nav">
          <div style={{ padding: '0 8px 8px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Reliability Engine
          </div>

          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`shell-nav-link ${isActive ? 'is-active' : ''}`}
              >
                {isActive && <div className="shell-nav-link-indicator" />}
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div style={{ padding: '20px 8px 8px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Reference & Specs
          </div>

          <a
            href="http://localhost:8080/swagger-ui/index.html"
            target="_blank"
            rel="noopener noreferrer"
            className="shell-nav-link"
          >
            <ExternalLink size={18} />
            <span>OpenAPI Docs</span>
          </a>

          <Link to="/" className="shell-nav-link">
            <ShieldCheck size={18} />
            <span>Project Overview</span>
          </Link>
        </nav>

        <div className="shell-sidebar-footer">
          <div className="sidebar-system-info">
            <div className="sidebar-system-info-title">
              <Server size={14} className="text-accent" />
              <span>Postgres + Spring Boot</span>
            </div>
            <div>Transactional idempotency & async reconciliation active.</div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="shell-main">
        <header className="shell-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="theme-toggle-btn d-lg-none"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              <Menu size={18} />
            </button>

            <div className="shell-breadcrumb">
              <Link to="/dashboard">System</Link>
              <ChevronRight size={14} />
              <span className="shell-breadcrumb-current">{getBreadcrumbTitle()}</span>
            </div>
          </div>

          <div className="shell-topbar-actions">
            {renderStatusPill()}

            <button
              type="button"
              className="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label="Toggle theme mode"
              title={isDark ? 'Switch to Light theme' : 'Switch to Dark theme'}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        <main className="shell-content">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
