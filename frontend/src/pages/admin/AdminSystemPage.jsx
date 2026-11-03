import React, { useState, useEffect } from 'react';
import {
  Server,
  Activity,
  Database,
  ShieldCheck,
  Settings,
  RefreshCw,
  ExternalLink,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Sliders
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../context/ToastContext';
import api from '../../api/client';

export default function AdminSystemPage() {
  const { showToast } = useToast();

  const [systemHealth, setSystemHealth] = useState(null);
  const [bankHealth, setBankHealth] = useState(null);
  const [adminConfig, setAdminConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const fetchSystemData = async () => {
    setLoading(true);
    try {
      const [sysWake, bHealth, cfg] = await Promise.allSettled([
        api.wakeSystem(),
        api.getBankHealth(),
        api.getAdminConfig()
      ]);

      if (sysWake.status === 'fulfilled') setSystemHealth(sysWake.value);
      if (bHealth.status === 'fulfilled') setBankHealth(bHealth.value);
      if (cfg.status === 'fulfilled') setAdminConfig(cfg.value);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemData();
  }, []);

  const handleResetSystem = async () => {
    setResetting(true);
    try {
      await api.resetSystem();
      showToast({
        title: 'System Reset Complete',
        description: 'Database tables and mock bank ledger have been purged successfully.',
        variant: 'success'
      });
      setResetModalOpen(false);
      fetchSystemData();
    } catch (err) {
      showToast({
        title: 'Reset Failed',
        description: err.message || 'Could not reset system. Check ADMIN_RESET_ENABLED.',
        variant: 'error'
      });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Server size={24} color="var(--color-brand-primary)" />
            System Status & Configuration
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
            Service health, database connections, timeouts, and operational configuration.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          icon={<RefreshCw size={14} />}
          loading={loading}
          onClick={fetchSystemData}
        >
          Refresh Status
        </Button>
      </div>

      {/* Services Health Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
        {/* Payment Service Card */}
        <Card style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'var(--color-brand-surface)',
                color: 'var(--color-brand-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                  payment-service
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Spring Boot 3.3.5 • JDK 17
                </div>
              </div>
            </div>

            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '12px',
              background: systemHealth?.paymentService === 'UP' ? 'var(--status-success-bg)' : 'var(--status-failed-bg)',
              color: systemHealth?.paymentService === 'UP' ? 'var(--status-success-text)' : 'var(--status-failed-text)',
              border: `1px solid ${systemHealth?.paymentService === 'UP' ? 'var(--status-success-border)' : 'var(--status-failed-border)'}`
            }}>
              {systemHealth?.paymentService === 'UP' ? 'ONLINE (UP)' : 'DOWN'}
            </span>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>HTTP Port:</span>
              <code style={{ fontFamily: 'var(--font-mono)' }}>8080</code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Database Driver:</span>
              <span>PostgreSQL 16 via HikariCP</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Flyway Migrations:</span>
              <span style={{ color: 'var(--color-success-500)', fontWeight: 600 }}>V1 Validated</span>
            </div>
          </div>
        </Card>

        {/* Mock Core Bank Card */}
        <Card style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'var(--color-brand-surface)',
                color: 'var(--color-brand-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Activity size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                  mock-bank (Core Bank Simulator)
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Isolated Ledger Schema (bank.*)
                </div>
              </div>
            </div>

            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '12px',
              background: bankHealth?.status === 'UP' || systemHealth?.mockBank === 'UP' ? 'var(--status-success-bg)' : 'var(--status-failed-bg)',
              color: bankHealth?.status === 'UP' || systemHealth?.mockBank === 'UP' ? 'var(--status-success-text)' : 'var(--status-failed-text)',
              border: `1px solid ${bankHealth?.status === 'UP' || systemHealth?.mockBank === 'UP' ? 'var(--status-success-border)' : 'var(--status-failed-border)'}`
            }}>
              {bankHealth?.status === 'UP' || systemHealth?.mockBank === 'UP' ? 'ONLINE (UP)' : 'DOWN'}
            </span>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>HTTP Port:</span>
              <code style={{ fontFamily: 'var(--font-mono)' }}>8081</code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Reconciliation Endpoint:</span>
              <code style={{ fontFamily: 'var(--font-mono)' }}>/bank/status/:id</code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Ledger Idempotency:</span>
              <span style={{ color: 'var(--color-success-500)', fontWeight: 600 }}>Active</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Operational Config Card */}
      <Card style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Sliders size={18} color="var(--color-brand-primary)" />
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
            Current Operational Engine Configuration
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Bank Read Timeout</div>
            <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{adminConfig?.bankReadTimeoutMs || 2000} ms</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Max wait before marking UNKNOWN</div>
          </div>

          <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Max Retry Attempts</div>
            <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{adminConfig?.retryMaxAttempts || 4} attempts</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Before dead-lettering</div>
          </div>

          <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Reconcile Grace Period</div>
            <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{adminConfig?.reconcileGraceMs || 6000} ms</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Settlement buffer before status query</div>
          </div>

          <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Stale Recovery Period</div>
            <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>60,000 ms</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Interruption crash recovery window</div>
          </div>
        </div>
      </Card>

      {/* Direct API Documentation & Dangerous Operations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
        {/* API Docs Links */}
        <Card style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 12px' }}>
            Interactive Documentation & Swagger
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <a
              href="http://localhost:8080/swagger-ui/index.html"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                textDecoration: 'none',
                fontSize: '13px'
              }}
            >
              <span>Swagger UI (Payment Service)</span>
              <ExternalLink size={14} color="var(--text-muted)" />
            </a>

            <a
              href="http://localhost:8080/v3/api-docs"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                textDecoration: 'none',
                fontSize: '13px'
              }}
            >
              <span>OpenAPI v3 Raw JSON Schema</span>
              <ExternalLink size={14} color="var(--text-muted)" />
            </a>
          </div>
        </Card>

        {/* System Reset / Emergency Reset */}
        <Card style={{ padding: '20px', border: '1px solid var(--status-failed-border)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--status-failed-text)', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} /> Dangerous Operations
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.5 }}>
            Purges all transaction records, idempotency keys, and mock bank ledgers to reset the demo environment to zero.
          </p>
          <Button
            variant="danger"
            size="sm"
            icon={<RotateCcw size={14} />}
            onClick={() => setResetModalOpen(true)}
          >
            Purge All Data & Reset Engine
          </Button>
        </Card>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Confirm System Database Reset"
      >
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 20px', lineHeight: 1.5 }}>
          Are you sure you want to purge all payment records and reset the mock bank ledger? This action cannot be undone.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <Button variant="ghost" onClick={() => setResetModalOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={resetting}
            onClick={handleResetSystem}
          >
            Yes, Purge Database
          </Button>
        </div>
      </Modal>
    </div>
  );
}
