import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  ArrowRight,
  Receipt,
  Copy,
  ExternalLink,
  RefreshCw,
  ShoppingBag
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import CopyButton from '../../components/ui/CopyButton';
import Modal from '../../components/ui/Modal';
import api from '../../api/client';

export default function MobileActivityPage() {
  const navigate = useNavigate();

  const [paymentIds, setPaymentIds] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Load payment IDs from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('rp_device_payments');
      if (stored) {
        const ids = JSON.parse(stored);
        if (Array.isArray(ids)) {
          setPaymentIds(ids);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch payment records for device IDs
  useEffect(() => {
    if (paymentIds.length === 0) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchAll = async () => {
      setLoading(true);
      try {
        const results = await Promise.all(
          paymentIds.map(id => api.getPayment(id).catch(() => null))
        );
        if (isMounted) {
          setPayments(results.filter(Boolean));
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAll();
    return () => { isMounted = false; };
  }, [paymentIds]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-brand-accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            This Device
          </div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, margin: '2px 0 0', color: 'var(--text-primary)' }}>
            Payment Activity
          </h1>
        </div>

        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {payments.length} transactions
        </span>
      </div>

      {loading ? (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
          Loading your transactions...
        </div>
      ) : payments.length === 0 ? (
        <Card style={{ padding: '36px 20px', textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'var(--bg-surface-elevated)',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px'
          }}>
            <ShoppingBag size={24} />
          </div>
          <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 6px', color: 'var(--text-primary)' }}>
            No Transactions Yet
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
            Payments made from this device will appear here with live tracking.
          </p>
          <Button variant="primary" size="sm" onClick={() => navigate('/app')}>
            Make a Test Payment
          </Button>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {payments.map(p => (
            <Card
              key={p.id}
              onClick={() => setSelectedReceipt(p)}
              style={{
                padding: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'border-color 0.15s ease'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    ₹{Number(p.amount || 0).toLocaleString()}
                  </span>
                  <StatusBadge status={p.status} size="sm" />
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                  {p.merchantRef}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {new Date(p.createdAt || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              <div style={{ color: 'var(--text-muted)' }}>
                <ArrowRight size={16} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Receipt Modal */}
      <Modal
        isOpen={Boolean(selectedReceipt)}
        onClose={() => setSelectedReceipt(null)}
        title="Transaction Receipt"
      >
        {selectedReceipt && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                ₹{Number(selectedReceipt.amount || 0).toLocaleString()}
              </div>
              <div style={{ marginTop: '8px' }}>
                <StatusBadge status={selectedReceipt.status} size="md" />
              </div>
            </div>

            <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Merchant Ref:</span>
                <span style={{ fontWeight: 600 }}>{selectedReceipt.merchantRef}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Payment ID:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <code style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{selectedReceipt.id.slice(0, 12)}...</code>
                  <CopyButton textToCopy={selectedReceipt.id} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Mode:</span>
                <span style={{ fontWeight: 600, color: 'var(--color-brand-primary)' }}>{selectedReceipt.mode}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Attempts:</span>
                <span>{selectedReceipt.attemptCount || 1} of 4</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Created:</span>
                <span>{new Date(selectedReceipt.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedReceipt(null)}
                style={{ flex: 1 }}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const id = selectedReceipt.id;
                  setSelectedReceipt(null);
                  navigate(`/app/progress/${id}`);
                }}
                style={{ flex: 1 }}
              >
                Live Journey
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
