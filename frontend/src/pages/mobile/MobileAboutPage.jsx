import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Server,
  Sparkles,
  Info,
  ExternalLink,
  Cpu,
  Layers,
  CheckCircle2
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function MobileAboutPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
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
          <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            About ReliablePay
          </h1>
          <div style={{ fontSize: '11px', color: 'var(--color-brand-accent)', fontWeight: 600 }}>
            Fault-Tolerant Payment Processing
          </div>
        </div>
      </div>

      <Card style={{ padding: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 8px', color: 'var(--text-primary)' }}>
          What is ReliablePay?
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 12px' }}>
          ReliablePay is a production-grade fault-tolerant payment gateway engine built for the
          <strong> Alliance University × Citi Industry Brief</strong>. It demonstrates how modern financial
          systems eliminate duplicate debits under severe bank network instability, dropped connections, and server failures.
        </p>

        <div style={{
          padding: '10px 12px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-subtle)',
          fontSize: '11px',
          color: 'var(--text-secondary)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--text-primary)' }}>
            <CheckCircle2 size={13} color="var(--color-success-500)" />
            <span>Strict Idempotency Locking</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--text-primary)' }}>
            <CheckCircle2 size={13} color="var(--color-success-500)" />
            <span>Automated Reconciliation for UNKNOWN</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--text-primary)' }}>
            <CheckCircle2 size={13} color="var(--color-success-500)" />
            <span>Zero Double Debits Guaranteed</span>
          </div>
        </div>
      </Card>

      <Card style={{ padding: '16px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-brand-accent)', fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>
          <Sparkles size={16} />
          <span>Simulated Environment Notice</span>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
          All transactions run against a local simulated banking core. <strong>No real money, fiat currency, or live credit networks are involved.</strong>
        </p>
      </Card>

      {/* Link to Admin Console */}
      <Card style={{ padding: '16px', border: '1.5px solid var(--color-brand-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <Cpu size={18} color="var(--color-brand-primary)" />
          <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
            Engine Operations
          </h3>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 14px', lineHeight: 1.5 }}>
          Inspect the live state transition pipeline, inject network chaos, and run benchmark stress trials in the Admin Console.
        </p>
        <Link to="/admin" style={{ textDecoration: 'none' }}>
          <Button
            variant="primary"
            size="sm"
            style={{ width: '100%' }}
            icon={<ExternalLink size={14} />}
          >
            Open Admin Console
          </Button>
        </Link>
      </Card>

      <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
        Design Project Team: Kousik, Shawarima, Rashmi, Nehaa<br />
        Alliance University • Citi Industry Brief
      </div>
    </div>
  );
}
