import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  RotateCcw,
  HelpCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Copy,
  Receipt,
  WifiOff,
  Radio
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import CopyButton from '../../components/ui/CopyButton';
import { BASE_URL, api } from '../../api/client';

export default function MobileProgressPage() {
  const { id: paymentId } = useParams();
  const navigate = useNavigate();

  const [payment, setPayment] = useState(null);
  const [events, setEvents] = useState([]);
  const [streamConnected, setStreamConnected] = useState(false);
  const [isPollingFallback, setIsPollingFallback] = useState(false);
  const [techDetailsOpen, setTechDetailsOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  const ctrlRef = useRef(null);

  // Poll fallback function
  const pollPaymentData = async () => {
    try {
      const p = await api.getPayment(paymentId);
      setPayment(p);
      const evts = await api.getPaymentEvents(paymentId);
      if (Array.isArray(evts)) setEvents(evts);
    } catch {
      // ignore
    }
  };

  // Connect to SSE stream
  useEffect(() => {
    if (!paymentId) return;

    let aborted = false;
    const abortController = new AbortController();
    ctrlRef.current = abortController;

    const streamUrl = `${BASE_URL}/api/payments/${paymentId}/stream`;

    fetchEventSource(streamUrl, {
      signal: abortController.signal,
      onopen(response) {
        if (response.ok) {
          setStreamConnected(true);
          setIsPollingFallback(false);
          return Promise.resolve();
        }
        throw new Error(`SSE open failed: ${response.status}`);
      },
      onmessage(event) {
        if (!event.data || event.event === 'heartbeat') return;

        try {
          const payload = JSON.parse(event.data);
          if (event.event === 'snapshot') {
            setPayment(payload);
          } else if (event.event === 'transition') {
            setPayment(prev => ({
              ...(prev || {}),
              status: payload.toStatus,
              attemptCount: payload.attemptCount || prev?.attemptCount || 1,
              updatedAt: payload.occurredAt || new Date().toISOString()
            }));
            setEvents(prev => [...prev, payload]);
          }
        } catch {
          // parse error
        }
      },
      onerror(err) {
        setStreamConnected(false);
        setIsPollingFallback(true);
        // Fall back to polling immediately
        pollPaymentData();
      }
    });

    // Also fetch initial events for audit
    api.getPaymentEvents(paymentId)
      .then(evts => { if (Array.isArray(evts)) setEvents(evts); })
      .catch(() => {});

    return () => {
      aborted = true;
      abortController.abort();
    };
  }, [paymentId]);

  // Polling fallback loop if stream drops
  useEffect(() => {
    if (!isPollingFallback) return;

    pollPaymentData();
    const interval = setInterval(pollPaymentData, 2000);
    return () => clearInterval(interval);
  }, [isPollingFallback, paymentId]);

  const currentStatus = payment?.status || 'INITIATED';
  const isTerminal = ['SUCCESS', 'FAILED', 'DEAD_LETTERED'].includes(currentStatus);
  const isRetrying = currentStatus === 'RETRYING';
  const isUnknown = currentStatus === 'UNKNOWN';
  const isSuccess = currentStatus === 'SUCCESS';
  const isFailed = currentStatus === 'DEAD_LETTERED' || currentStatus === 'FAILED';

  // Compute active vertical stepper steps
  const steps = [
    {
      title: 'Payment received',
      desc: 'Order verified and idempotency lease acquired',
      state: 'DONE'
    },
    {
      title: 'Contacting bank',
      desc: isSuccess
        ? 'Bank transaction authorized'
        : isRetrying
        ? `Attempt ${payment?.attemptCount || 1} reached bank`
        : 'Dispatching secure charge protocol',
      state: isTerminal || isRetrying || isUnknown ? 'DONE' : 'ACTIVE'
    }
  ];

  if (isRetrying || events.some(e => e.toStatus === 'RETRYING')) {
    steps.push({
      title: `Bank is slow, trying again (attempt ${payment?.attemptCount || 2})`,
      desc: 'Network timeout detected • Exponential backoff engaged',
      state: isRetrying ? 'ACTIVE' : 'DONE',
      variant: 'retrying'
    });
  }

  if (isUnknown || events.some(e => e.toStatus === 'UNKNOWN')) {
    steps.push({
      title: 'Confirming with the bank',
      desc: 'Reconciliation worker verifying actual ledger debit status',
      state: isUnknown ? 'ACTIVE' : 'DONE',
      variant: 'unknown'
    });
  }

  steps.push({
    title: isSuccess ? 'Paid successfully' : isFailed ? 'Could not complete' : 'Awaiting confirmation',
    desc: isSuccess
      ? 'Zero duplicate debits guaranteed'
      : isFailed
      ? 'Payment moved to dead-letter queue safely'
      : 'Finalizing settlement',
    state: isTerminal ? 'DONE' : 'PENDING'
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '20px' }}>
      {/* Top Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={() => navigate('/app')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '13px'
          }}
        >
          <ArrowLeft size={16} /> Pay
        </button>

        {isPollingFallback ? (
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: '10px',
            background: 'var(--status-retrying-bg)',
            color: 'var(--status-retrying-text)',
            border: '1px solid var(--status-retrying-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <RotateCcw size={10} className="spin" /> Polling (2s)
          </span>
        ) : (
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: '10px',
            background: 'var(--status-success-bg)',
            color: 'var(--status-success-text)',
            border: '1px solid var(--status-success-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Radio size={10} /> Live SSE
          </span>
        )}
      </div>

      {/* Main Status Hero Card */}
      <Card style={{
        padding: '20px',
        textAlign: 'center',
        background: isSuccess
          ? 'radial-gradient(ellipse at top, rgba(34, 197, 94, 0.15) 0%, var(--bg-surface) 100%)'
          : isFailed
          ? 'radial-gradient(ellipse at top, rgba(239, 68, 68, 0.15) 0%, var(--bg-surface) 100%)'
          : 'var(--bg-surface)',
        border: `1.5px solid ${isSuccess ? 'var(--color-success-500)' : isFailed ? 'var(--color-error-500)' : 'var(--border-subtle)'}`
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: isSuccess ? 'var(--status-success-bg)' : isRetrying ? 'var(--status-retrying-bg)' : isUnknown ? 'var(--status-unknown-bg)' : 'var(--color-brand-surface)',
          color: isSuccess ? 'var(--color-success-500)' : isRetrying ? 'var(--color-warning-500)' : isUnknown ? 'var(--status-unknown-text)' : 'var(--color-brand-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 12px'
        }}>
          {isSuccess ? <CheckCircle2 size={32} /> : isRetrying ? <RotateCcw size={28} className="spin" /> : isUnknown ? <HelpCircle size={28} /> : <Clock size={28} />}
        </div>

        <div style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginBottom: '4px' }}>
          ₹{Number(payment?.amount || 0).toLocaleString()}
        </div>

        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px' }}>
          {payment?.merchantRef || 'Payment Order'}
        </div>

        {/* Prominent Safety Guarantee Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '16px',
          background: 'var(--color-brand-surface)',
          border: '1px solid var(--color-brand-border)',
          color: 'var(--color-brand-primary)',
          fontSize: '12px',
          fontWeight: 700
        }}>
          <ShieldCheck size={14} />
          <span>You will not be charged twice</span>
        </div>

        {/* Attempt Counter */}
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
          Attempt {payment?.attemptCount || 1} of 4 • Status: <strong style={{ color: 'var(--text-primary)' }}>{currentStatus}</strong>
        </div>
      </Card>

      {/* Vertical Stepper in Friendly Words */}
      <Card style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 16px', color: 'var(--text-primary)' }}>
          Payment Journey
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
          {steps.map((step, idx) => {
            const isStepActive = step.state === 'ACTIVE';
            const isStepDone = step.state === 'DONE';

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', gap: '12px', position: 'relative' }}
              >
                {/* Step Indicator Dot */}
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: isStepDone
                    ? 'var(--color-success-500)'
                    : isStepActive
                    ? step.variant === 'unknown' ? 'var(--color-unknown-500, #a855f7)' : 'var(--color-brand-primary)'
                    : 'var(--bg-surface-elevated)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                  flexShrink: 0,
                  zIndex: 2,
                  boxShadow: isStepActive ? '0 0 0 4px var(--color-brand-surface)' : 'none'
                }}>
                  {isStepDone ? '✓' : idx + 1}
                </div>

                {/* Step Text */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: isStepActive ? 700 : 600,
                    color: isStepActive ? 'var(--color-brand-primary)' : isStepDone ? 'var(--text-primary)' : 'var(--text-muted)'
                  }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {step.desc}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </Card>

      {/* Technical Details Expander */}
      <Card style={{ padding: '0', overflow: 'hidden' }}>
        <button
          type="button"
          onClick={() => setTechDetailsOpen(!techDetailsOpen)}
          style={{
            width: '100%',
            padding: '14px 16px',
            background: 'none',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 600
          }}
        >
          <span>Technical Diagnostics</span>
          {techDetailsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        <AnimatePresence>
          {techDetailsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border-subtle)', fontSize: '11px', color: 'var(--text-secondary)' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Payment UUID:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <code style={{ fontFamily: 'var(--font-mono)' }}>{paymentId?.slice(0, 12)}...</code>
                    <CopyButton textToCopy={paymentId || ''} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Idempotency-Key:</span>
                  <code style={{ fontFamily: 'var(--font-mono)' }}>{payment?.idempotencyKey || 'idem-key'}</code>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Reliability Mode:</span>
                  <strong style={{ color: 'var(--color-brand-primary)' }}>{payment?.mode || 'PROTECTED'}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Raw Status:</span>
                  <StatusBadge status={currentStatus} size="sm" />
                </div>

                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>Event Log:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {events.map((e, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                        <span>{e.toStatus || e.status}</span>
                        <span>{new Date(e.createdAt || e.occurredAt || Date.now()).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Bottom Actions */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <Button
          variant="outline"
          size="md"
          icon={<Receipt size={14} />}
          onClick={() => navigate('/app/activity')}
          style={{ flex: 1 }}
        >
          View Activity
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={() => navigate('/app')}
          style={{ flex: 1 }}
        >
          New Payment
        </Button>
      </div>
    </div>
  );
}
