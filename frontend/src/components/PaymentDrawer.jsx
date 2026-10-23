import React, { useEffect, useState } from 'react';
import api from '../api/client';
import StatusBadge from './StatusBadge';

export default function PaymentDrawer({ paymentId, onClose, onPaymentUpdated }) {
  const [payment, setPayment] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requeuing, setRequeuing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!paymentId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      api.getPayment(paymentId),
      api.getPaymentEvents(paymentId)
    ])
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

  const handleRequeue = async () => {
    if (!paymentId) return;
    setRequeuing(true);
    setError(null);

    try {
      const updated = await api.requeuePayment(paymentId);
      setPayment(updated);
      // Refresh events
      const refreshedEvents = await api.getPaymentEvents(paymentId);
      setEvents(refreshedEvents);
      if (onPaymentUpdated) {
        onPaymentUpdated(updated);
      }
    } catch (err) {
      setError(err.message || 'Failed to requeue payment');
    } finally {
      setRequeuing(false);
    }
  };

  if (!paymentId) return null;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>Payment Details</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              {paymentId}
            </span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            ✕ Close
          </button>
        </div>

        <div className="drawer-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <div style={{ display: 'inline-block', width: '24px', height: '24px', border: '3px solid #cbd5e1', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
              <p style={{ marginTop: '12px', fontSize: '0.9rem' }}>Loading timeline & details...</p>
            </div>
          ) : error ? (
            <div style={{ padding: '16px', background: '#fef2f2', border: '1px solid #fecdd3', borderRadius: '8px', color: '#991b1b', fontSize: '0.85rem' }}>
              <strong>Error:</strong> {error}
            </div>
          ) : payment ? (
            <>
              {/* Summary Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px', background: 'var(--bg-card-subtle)', padding: '16px', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</div>
                  <div style={{ marginTop: '4px' }}>
                    <StatusBadge status={payment.status} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Mode</div>
                  <div style={{ marginTop: '4px' }}>
                    <span className={`badge-mode badge-mode-${payment.mode}`}>{payment.mode}</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Amount</div>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)', marginTop: '2px' }}>
                    ₹{Number(payment.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Attempts</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
                    {payment.attemptCount} / 4
                  </div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Merchant Ref</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--primary-800)', marginTop: '2px' }}>
                    {payment.merchantRef}
                  </div>
                </div>
                {payment.idempotencyKey && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Idempotency Key</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px', wordBreak: 'break-all' }}>
                      {payment.idempotencyKey}
                    </div>
                  </div>
                )}
                {payment.lastError && (
                  <div style={{ gridColumn: '1 / -1', background: '#fff', padding: '8px 12px', borderLeft: '3px solid #ef4444', borderRadius: '4px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#991b1b', fontWeight: 700, textTransform: 'uppercase' }}>Last Error</div>
                    <div style={{ fontSize: '0.8rem', color: '#b91c1c', marginTop: '2px' }}>
                      {payment.lastError}
                    </div>
                  </div>
                )}
              </div>

              {/* Dead letter requeue CTA */}
              {payment.status === 'DEAD_LETTERED' && (
                <div style={{ marginBottom: '24px', padding: '16px', background: '#fef2f2', border: '1px solid #fecdd3', borderRadius: '8px' }}>
                  <h4 style={{ fontSize: '0.9rem', color: '#991b1b', marginBottom: '6px', fontWeight: 700 }}>
                    Dead-Lettered Payment
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: '#7f1d1d', marginBottom: '12px' }}>
                    Maximum retry attempts exhausted. You can manually requeue this payment back into <code>RETRYING</code> state with attempt count reset to 0.
                  </p>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={handleRequeue}
                    disabled={requeuing}
                    style={{ width: '100%' }}
                  >
                    {requeuing ? 'Requeuing...' : '↻ Requeue Payment to Retry'}
                  </button>
                </div>
              )}

              {/* Event Timeline */}
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px' }}>
                Audit Event Trail ({events.length})
              </h4>

              {events.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>No events recorded for this payment yet.</p>
              ) : (
                <div className="timeline">
                  {events.map((evt, idx) => (
                    <div key={evt.id || idx} className="timeline-item">
                      <div className="timeline-dot"></div>
                      <div className="timeline-content">
                        <div className="timeline-time">
                          {new Date(evt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', millisecond: 'numeric' })}
                        </div>
                        <div className="timeline-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {evt.fromStatus ? (
                            <>
                              <StatusBadge status={evt.fromStatus} />
                              <span style={{ color: 'var(--text-dim)' }}>→</span>
                            </>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Created</span>
                          )}
                          <StatusBadge status={evt.toStatus} />
                        </div>
                        {evt.detail && (
                          <div className="timeline-detail">{evt.detail}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>

        <div className="drawer-footer">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
