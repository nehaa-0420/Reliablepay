import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlayCircle,
  Loader2,
  CheckCircle2,
  RefreshCw,
  HelpCircle,
  AlertOctagon,
  Clock,
  ArrowRight,
  Shield,
  Zap,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import api from '../api/client';
import Drawer from './ui/Drawer';
import StatusBadge from './ui/StatusBadge';
import Button from './ui/Button';
import CopyButton from './ui/CopyButton';
import Skeleton from './ui/Skeleton';
import Modal from './ui/Modal';
import { useToast } from '../context/ToastContext';

export default function PaymentDrawer({ paymentId, onClose, onPaymentUpdated }) {
  const [payment, setPayment] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requeuing, setRequeuing] = useState(false);
  const [showRequeueConfirm, setShowRequeueConfirm] = useState(false);
  const [error, setError] = useState(null);
  const toast = useToast();

  useEffect(() => {
    if (!paymentId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([api.getPayment(paymentId), api.getPaymentEvents(paymentId)])
      .then(([payData, evtsData]) => {
        if (!isMounted) return;
        setPayment(payData);
        setEvents(Array.isArray(evtsData) ? evtsData : []);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Failed to load payment details');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [paymentId]);

  const handleConfirmRequeue = async () => {
    if (!paymentId) return;
    setRequeuing(true);
    setShowRequeueConfirm(false);
    try {
      const updated = await api.requeuePayment(paymentId);
      setPayment(updated);
      toast.success(`Payment ${paymentId.substring(0, 8)}... requeued for reprocessing`);
      const refreshedEvents = await api.getPaymentEvents(paymentId);
      setEvents(refreshedEvents);
      if (onPaymentUpdated) {
        onPaymentUpdated(updated);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to requeue payment');
    } finally {
      setRequeuing(false);
    }
  };

  const getEventIcon = (status) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle2 size={16} className="text-success" />;
      case 'PROCESSING':
        return <Loader2 size={16} className="spin text-info" />;
      case 'RETRYING':
        return <RefreshCw size={16} className="text-warning" />;
      case 'UNKNOWN':
        return <HelpCircle size={16} className="text-accent" />;
      case 'DEAD_LETTERED':
      case 'FAILED':
        return <AlertOctagon size={16} className="text-danger" />;
      case 'INITIATED':
      default:
        return <PlayCircle size={16} className="text-muted" />;
    }
  };

  // Compute time difference between steps
  const getTimeDelta = (currTime, prevTime) => {
    if (!prevTime) return null;
    const diffMs = Math.abs(new Date(currTime) - new Date(prevTime));
    if (diffMs < 1000) return `+${diffMs}ms`;
    if (diffMs < 60000) return `+${(diffMs / 1000).toFixed(1)}s`;
    return `+${Math.round(diffMs / 60000)}m`;
  };

  return (
    <>
      <Drawer
        isOpen={Boolean(paymentId)}
        onClose={onClose}
        title={payment ? `${payment.currency} ${Number(payment.amount).toFixed(2)}` : 'Payment Details'}
        subtitle={
          paymentId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>ID: {paymentId}</span>
              <CopyButton text={paymentId} size="sm" />
            </div>
          )
        }
        footer={
          payment && payment.status === 'DEAD_LETTERED' ? (
            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Exceeded retry attempts
              </span>
              <Button
                variant="primary"
                size="sm"
                icon={RotateCcw}
                loading={requeuing}
                onClick={() => setShowRequeueConfirm(true)}
              >
                Requeue Payment
              </Button>
            </div>
          ) : (
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          )
        }
      >
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Skeleton variant="rect" height="120px" />
            <Skeleton variant="text" width="60%" height="20px" />
            <Skeleton variant="rect" height="200px" />
          </div>
        ) : error ? (
          <div style={{ padding: '20px', background: 'var(--status-failed-light)', border: '1px solid var(--status-failed-border)', borderRadius: '12px', color: 'var(--status-failed-dark)' }}>
            <strong>Error:</strong> {error}
          </div>
        ) : payment ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Status & Key Meta Card */}
            <div style={{ background: 'var(--bg-surface-subtle)', border: '1px solid var(--border-subtle)', borderRadius: '14px', padding: '18px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</div>
                <div style={{ marginTop: '6px' }}>
                  <StatusBadge status={payment.status} size="md" />
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Protocol Mode</div>
                <div style={{ marginTop: '6px' }}>
                  <StatusBadge status={payment.mode} size="md" />
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Merchant Ref</div>
                <div style={{ marginTop: '4px', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {payment.merchantRef || '—'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Attempt Count</div>
                <div style={{ marginTop: '4px', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {payment.attemptCount ?? 0}
                </div>
              </div>

              {payment.idempotencyKey && (
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Idempotency Key</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', background: 'var(--bg-surface)', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {payment.idempotencyKey}
                    </span>
                    <CopyButton text={payment.idempotencyKey} size="sm" />
                  </div>
                </div>
              )}

              {payment.lastError && (
                <div style={{ gridColumn: 'span 2', padding: '10px 12px', background: 'var(--status-failed-light)', border: '1px solid var(--status-failed-border)', borderRadius: '8px', color: 'var(--status-failed-dark)', fontSize: '0.8rem' }}>
                  <strong>Last Error:</strong> {payment.lastError}
                </div>
              )}
            </div>

            {/* Event Timeline */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Clock size={16} className="text-muted" />
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Transaction Lifecycle Timeline
                </h4>
              </div>

              {events.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-surface-subtle)', borderRadius: '12px', fontSize: '0.88rem' }}>
                  No lifecycle events recorded yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', paddingLeft: '8px' }}>
                  {events.map((evt, idx) => {
                    const prevEvt = idx > 0 ? events[idx - 1] : null;
                    const delta = prevEvt ? getTimeDelta(evt.createdAt, prevEvt.createdAt) : null;

                    return (
                      <motion.div
                        key={evt.id || idx}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        style={{ display: 'flex', gap: '14px', position: 'relative', paddingBottom: idx === events.length - 1 ? '0' : '24px' }}
                      >
                        {/* Timeline Connector Line */}
                        {idx !== events.length - 1 && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '26px',
                              bottom: '0',
                              left: '14px',
                              width: '2px',
                              backgroundColor: 'var(--border-subtle)',
                              zIndex: 0
                            }}
                          />
                        )}

                        {/* Node Icon */}
                        <div
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--bg-surface)',
                            border: '2px solid var(--border-default)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1,
                            flexShrink: 0
                          }}
                        >
                          {getEventIcon(evt.toStatus)}
                        </div>

                        {/* Event Details */}
                        <div style={{ flex: 1, paddingTop: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {evt.fromStatus} → {evt.toStatus}
                              </span>
                              {delta && (
                                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-accent-600)', background: 'var(--color-accent-50)', padding: '1px 6px', borderRadius: '4px' }}>
                                  {delta}
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                              {new Date(evt.createdAt).toLocaleTimeString()}
                            </span>
                          </div>

                          {evt.reason && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                              {evt.reason}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* Confirmation Modal for Requeue */}
      <Modal
        isOpen={showRequeueConfirm}
        onClose={() => setShowRequeueConfirm(false)}
        title="Confirm Payment Requeue"
        subtitle="This will place the dead-lettered payment back into the active processing queue."
        footer={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="secondary" size="sm" onClick={() => setShowRequeueConfirm(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" icon={RotateCcw} onClick={handleConfirmRequeue}>
              Confirm Requeue
            </Button>
          </div>
        }
      >
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
          Are you sure you want to requeue payment <strong className="font-mono">{paymentId}</strong>? The system will reset the attempt counter and retry processing against the mock bank gateway.
        </p>
      </Modal>
    </>
  );
}
