import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, User, ArrowRight, AlertCircle, Smartphone } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';

export default function AdminLoginPage() {
  const { login, isLoading, isAuthenticated } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const from = location.state?.from?.pathname || '/admin';

  // If already authenticated, redirect
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Please provide both username and password.');
      return;
    }

    const res = await login(username.trim(), password);
    if (res.success) {
      navigate(from, { replace: true });
    } else {
      setError(res.error || 'Authentication failed. Please verify credentials.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'radial-gradient(ellipse at top, var(--bg-surface-elevated) 0%, var(--bg-root) 100%)',
      position: 'relative'
    }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-accent))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 8px 24px var(--shadow-brand)',
              color: '#ffffff'
            }}>
              <ShieldCheck size={32} strokeWidth={2.2} />
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
              Admin Console
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
              ReliablePay Telemetry, Live Streams & Chaos Controls
            </p>
          </div>

          <Card style={{ padding: '32px', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-elevation-3)' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--status-failed-bg)',
                    color: 'var(--status-failed-text)',
                    border: '1px solid var(--status-failed-border)',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </motion.div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
                  Admin Username
                </label>
                <Input
                  id="admin-username-input"
                  type="text"
                  placeholder="e.g. admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  leftIcon={<User size={16} />}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
                  Password
                </label>
                <Input
                  id="admin-password-input"
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock size={16} />}
                  required
                />
              </div>

              <Button
                id="admin-login-submit"
                type="submit"
                variant="primary"
                size="lg"
                loading={isLoading}
                style={{ width: '100%', marginTop: '4px' }}
                icon={<ArrowRight size={18} />}
              >
                Sign In to Console
              </Button>
            </form>
          </Card>

          <div style={{ textAlign: 'center', marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '13px' }}>
            <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
              ← Back to Overview
            </Link>
            <span style={{ color: 'var(--border-strong)' }}>•</span>
            <Link to="/app" style={{ color: 'var(--color-brand-accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Smartphone size={14} /> Open Customer App
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
