import React, { useEffect, useState, useRef } from 'react';
import api from '../api/client';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import PaymentDrawer from '../components/PaymentDrawer';

function generateRandomKey() {
  return 'KEY-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now().toString(36);
}

function generateRandomOrderRef() {
  return 'ORD-' + Math.floor(100000 + Math.random() * 900000);
}

export default function DashboardPage() {
  // Metrics state
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  // Payments table state
  const [payments, setPayments] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modeFilter, setModeFilter] = useState('ALL');
  const [tableLoading, setTableLoading] = useState(true);

  // Form state
  const [merchantRef, setMerchantRef] = useState(generateRandomOrderRef());
  const [amount, setAmount] = useState('500.00');
  const [currency, setCurrency] = useState('INR');
  const [mode, setMode] = useState('PROTECTED');
  const [idempotencyKey, setIdempotencyKey] = useState(generateRandomKey());
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [doubleSubmitResult, setDoubleSubmitResult] = useState(null);

  // Drawer state
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);

  // Poll metrics
  const fetchMetrics = async () => {
    try {
      const data = await api.getMetricsSummary();
      setMetrics(data);
    } catch (err) {
      console.error('Failed to fetch metrics', err);
    } finally {
      setMetricsLoading(false);
    }
  };

  // Poll payments
  const fetchPayments = async (isInitial = false) => {
    if (isInitial) setTableLoading(true);
    try {
      const res = await api.getPayments({
        status: statusFilter,
        mode: modeFilter,
        page,
        size: 10
      });
      if (res && res.content) {
        setPayments(res.content);
        setTotalPages(res.totalPages || 0);
        setTotalElements(res.totalElements || 0);
      }
    } catch (err) {
      console.error('Failed to fetch payments', err);
    } finally {
      if (isInitial) setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    fetchPayments(true);

    const interval = setInterval(() => {
      fetchMetrics();
      fetchPayments(false);
    }, 2000);

    return () => clearInterval(interval);
  }, [page, statusFilter, modeFilter]);

  // Handle single submit
  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitResult(null);
    setDoubleSubmitResult(null);

    try {
      const payload = {
        merchantRef,
        amount: parseFloat(amount),
        currency,
        mode
      };
      const keyToSend = mode === 'PROTECTED' ? idempotencyKey : null;
      const res = await api.createPayment(payload, keyToSend);
      setSubmitResult({
        success: true,
        payment: res,
        message: `Payment ${res.id} created successfully with initial status ${res.status}!`
      });
      // Prepare fresh key and ref for next submit
      setMerchantRef(generateRandomOrderRef());
      setIdempotencyKey(generateRandomKey());
      fetchPayments(false);
      fetchMetrics();
    } catch (err) {
      setSubmitResult({
        success: false,
        message: err.message || 'Payment submission failed'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle "Send twice at once"
  const handleDoubleSubmit = async () => {
    setSubmitting(true);
    setSubmitResult(null);
    setDoubleSubmitResult(null);

    const payload = {
      merchantRef,
      amount: parseFloat(amount),
      currency,
      mode
    };
    const keyToSend = mode === 'PROTECTED' ? idempotencyKey : null;

    try {
      // Fire two identical requests simultaneously
      const [res1, res2] = await Promise.all([
        api.createPayment(payload, keyToSend),
        api.createPayment(payload, keyToSend)
      ]);

      setDoubleSubmitResult({
        success: true,
        res1,
        res2,
        samePayment: res1.id === res2.id
      });

      // Prepare fresh key and ref
      setMerchantRef(generateRandomOrderRef());
      setIdempotencyKey(generateRandomKey());
      fetchPayments(false);
      fetchMetrics();
    } catch (err) {
      setDoubleSubmitResult({
        success: false,
        message: err.message || 'Concurrent submission encountered an error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dashboard-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--primary-900)', letterSpacing: '-0.02em' }}>
            Payment Reliability Dashboard
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Real-time telemetry, idempotent dispatch engine, and live state transitions.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              fetchMetrics();
              fetchPayments(true);
            }}
          >
            ↻ Refresh Now
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="metrics-grid">
        <MetricCard
          title="Total Charges"
          value={metrics ? metrics.totalCharges : '—'}
          subtext="Actual bank transactions"
        />
        <MetricCard
          title="Duplicate Orders"
          value={metrics ? metrics.duplicateOrdersCount : '—'}
          subtext="Bank charges > 1 per order"
          highlight={metrics && metrics.duplicateOrdersCount > 0 ? 'danger' : 'success'}
        />
        <MetricCard
          title="Overcharged Amount"
          value={metrics ? `₹${Number(metrics.overchargedAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
          subtext="Funds lost to double debits"
          highlight={metrics && Number(metrics.overchargedAmount) > 0 ? 'danger' : 'success'}
        />
        <MetricCard
          title="Retry Success Rate"
          value={metrics ? `${(metrics.retrySuccessRate * 100).toFixed(1)}%` : '—'}
          subtext="Retries that resolved to SUCCESS"
        />
        <MetricCard
          title="Avg Recovery Time"
          value={metrics ? `${Math.round(metrics.avgRecoveryMs)} ms` : '—'}
          subtext="MTTR from failure to success"
        />
        <MetricCard
          title="Avg Latency"
          value={metrics ? `${Math.round(metrics.avgLatencyMs || 0)} ms` : '—'}
          subtext="Mean attempt turnaround time"
        />
        <MetricCard
          title="P95 Latency"
          value={metrics ? `${Math.round(metrics.p95LatencyMs || 0)} ms` : '—'}
          subtext="95th percentile attempt latency"
        />
        <MetricCard
          title="Stuck UNKNOWN"
          value={metrics ? metrics.stuckUnknownCount : '—'}
          subtext="Awaiting bank reconciliation"
          highlight={metrics && metrics.stuckUnknownCount > 0 ? 'danger' : 'success'}
        />
      </div>

      {/* Main Grid: Create Payment Form & Live Table */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Create Payment Card */}
        <div className="card">
          <h2 className="card-title">Initiate Payment</h2>
          <p className="card-subtitle">Test idempotency & failure handling live</p>

          <form onSubmit={handleSingleSubmit}>
            <div className="form-group">
              <label className="form-label">Merchant Reference</label>
              <input
                type="text"
                className="form-input font-mono"
                value={merchantRef}
                onChange={(e) => setMerchantRef(e.target.value)}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="form-input"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Currency</label>
                <input
                  type="text"
                  className="form-input"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  maxLength="3"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Processing Mode</label>
              <select
                className="form-select"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <option value="PROTECTED">PROTECTED (Idempotent + Reconciled)</option>
                <option value="NAIVE">NAIVE (Unsafe Baseline, Blind Retries)</option>
              </select>
            </div>

            {mode === 'PROTECTED' && (
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Idempotency-Key</label>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--accent-600)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                    onClick={() => setIdempotencyKey(generateRandomKey())}
                  >
                    ↻ Regenerate
                  </button>
                </div>
                <input
                  type="text"
                  className="form-input font-mono"
                  value={idempotencyKey}
                  onChange={(e) => setIdempotencyKey(e.target.value)}
                  required
                />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Dispatching...' : 'Send Payment'}
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                disabled={submitting}
                onClick={handleDoubleSubmit}
                title="Sends two identical requests simultaneously to test concurrent race condition"
              >
                ⚡ Send twice at once (Race Test)
              </button>
            </div>
          </form>

          {/* Single Submit Feedback */}
          {submitResult && (
            <div style={{ marginTop: '16px', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', background: submitResult.success ? '#ecfdf5' : '#fef2f2', border: `1px solid ${submitResult.success ? '#a7f3d0' : '#fecdd3'}`, color: submitResult.success ? '#065f46' : '#991b1b' }}>
              <div style={{ fontWeight: 700, marginBottom: '4px' }}>
                {submitResult.success ? '✓ Payment Dispatched' : '✗ Dispatch Failed'}
              </div>
              <div>{submitResult.message}</div>
              {submitResult.payment && (
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSelectedPaymentId(submitResult.payment.id)}
                  >
                    View Details & Timeline →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Double Submit Feedback */}
          {doubleSubmitResult && (
            <div style={{ marginTop: '16px', padding: '14px', borderRadius: '8px', fontSize: '0.85rem', background: doubleSubmitResult.samePayment ? '#ecfdf5' : '#fff1f2', border: `1px solid ${doubleSubmitResult.samePayment ? '#6ee7b7' : '#fecdd3'}` }}>
              <div style={{ fontWeight: 800, color: doubleSubmitResult.samePayment ? '#047857' : '#be123c', marginBottom: '8px' }}>
                {doubleSubmitResult.samePayment ? '✓ Idempotency Verified (1 Payment Created)' : '⚠ Duplicate Payments Created (NAIVE)'}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', background: 'rgba(255,255,255,0.7)', padding: '8px', borderRadius: '6px' }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Response 1 ID:</div>
                  <div style={{ color: 'var(--primary-900)', wordBreak: 'break-all' }}>{doubleSubmitResult.res1?.id}</div>
                  <div style={{ marginTop: '4px' }}><StatusBadge status={doubleSubmitResult.res1?.status} /></div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Response 2 ID:</div>
                  <div style={{ color: 'var(--primary-900)', wordBreak: 'break-all' }}>{doubleSubmitResult.res2?.id}</div>
                  <div style={{ marginTop: '4px' }}><StatusBadge status={doubleSubmitResult.res2?.status} /></div>
                </div>
              </div>

              <p style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {doubleSubmitResult.samePayment
                  ? 'Both concurrent requests matched the same idempotency key and received the identical payment record without double-charging.'
                  : 'In NAIVE mode, the lack of idempotency keys caused two separate payment records to be created for the same order!'}
              </p>
            </div>
          )}
        </div>

        {/* Live Payments Table Card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div>
              <h2 className="card-title" style={{ margin: 0 }}>Live Transactions</h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Showing {payments.length} of {totalElements} payments (Auto-refreshing every 2s)
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <select
                className="form-select"
                style={{ width: 'auto', padding: '6px 10px', fontSize: '0.85rem' }}
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(0);
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="PROCESSING">PROCESSING</option>
                <option value="RETRYING">RETRYING</option>
                <option value="UNKNOWN">UNKNOWN</option>
                <option value="DEAD_LETTERED">DEAD_LETTERED</option>
                <option value="FAILED">FAILED</option>
                <option value="INITIATED">INITIATED</option>
              </select>

              <select
                className="form-select"
                style={{ width: 'auto', padding: '6px 10px', fontSize: '0.85rem' }}
                value={modeFilter}
                onChange={(e) => {
                  setModeFilter(e.target.value);
                  setPage(0);
                }}
              >
                <option value="ALL">All Modes</option>
                <option value="PROTECTED">PROTECTED</option>
                <option value="NAIVE">NAIVE</option>
              </select>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Merchant Ref</th>
                  <th>Amount</th>
                  <th>Mode</th>
                  <th>Attempts</th>
                  <th>Updated</th>
                  <th>Last Error</th>
                </tr>
              </thead>
              <tbody>
                {tableLoading && payments.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      Loading transactions...
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      No payments found matching the current filter.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} onClick={() => setSelectedPaymentId(p.id)} title="Click to view event history and details">
                      <td>
                        <StatusBadge status={p.status} />
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {p.merchantRef}
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        ₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        <span className={`badge-mode badge-mode-${p.mode}`}>{p.mode}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {p.attemptCount}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {p.updatedAt ? new Date(p.updatedAt).toLocaleTimeString() : '—'}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: p.lastError ? '#ef4444' : 'var(--text-dim)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.lastError || 'None'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Page {totalPages > 0 ? page + 1 : 0} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                ← Previous
              </button>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Drawer */}
      <PaymentDrawer
        paymentId={selectedPaymentId}
        onClose={() => setSelectedPaymentId(null)}
        onPaymentUpdated={() => {
          fetchPayments(false);
          fetchMetrics();
        }}
      />
    </div>
  );
}
