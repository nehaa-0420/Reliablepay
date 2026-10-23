import React, { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Send,
  Zap,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertOctagon,
  Clock,
  Layers,
  ArrowUpDown,
  FileCheck,
  Check,
  RotateCw,
  PlusCircle,
  HelpCircle
} from 'lucide-react';
import api from '../api/client';
import Stat from '../components/ui/Stat';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import StatusBadge from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import CopyButton from '../components/ui/CopyButton';
import Tabs from '../components/ui/Tabs';
import Skeleton, { SkeletonTableRows } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import PaymentDrawer from '../components/PaymentDrawer';
import { useToast } from '../context/ToastContext';

function generateRandomKey() {
  return 'KEY-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
}

function generateRandomOrderRef() {
  return 'ORD-' + Math.floor(100000 + Math.random() * 900000);
}

function formatRelativeTime(dateString) {
  if (!dateString) return '—';
  const now = new Date();
  const date = new Date(dateString);
  const diffSec = Math.max(0, Math.floor((now - date) / 1000));

  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

export default function DashboardPage() {
  const toast = useToast();

  // Metrics state & sparkline history (last 30 points)
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [sparklines, setSparklines] = useState({
    total: [],
    successRate: [],
    retrying: [],
    unknown: [],
    deadLettered: [],
    duplicates: []
  });

  // Payments table state
  const [payments, setPayments] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modeFilter, setModeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [tableLoading, setTableLoading] = useState(true);

  // Track previous statuses for highlight animation on change
  const prevStatusesRef = useRef({});
  const [highlightedRowIds, setHighlightedRowIds] = useState(new Set());

  // Form state
  const [merchantRef, setMerchantRef] = useState(generateRandomOrderRef());
  const [amount, setAmount] = useState('500.00');
  const [currency, setCurrency] = useState('INR');
  const [mode, setMode] = useState('PROTECTED');
  const [idempotencyKey, setIdempotencyKey] = useState(generateRandomKey());
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [doubleSubmitResult, setDoubleSubmitResult] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  // Drawer state
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);

  // Poll metrics and record sparklines
  const fetchMetrics = async () => {
    try {
      const data = await api.getMetricsSummary();
      setMetrics(data);

      if (data) {
        const counts = data.statusCounts || {};
        const total = (data.totalCharges ?? 0) || Object.values(counts).reduce((a, b) => a + b, 0);
        const successRate = (data.retrySuccessRate ?? 0) * 100;
        const retrying = counts.RETRYING ?? 0;
        const unknown = counts.UNKNOWN ?? data.stuckUnknownCount ?? 0;
        const deadLettered = counts.DEAD_LETTERED ?? 0;
        const duplicates = data.duplicateOrdersCount ?? data.duplicateCharges ?? 0;

        setSparklines((prev) => ({
          total: [...prev.total.slice(-29), total],
          successRate: [...prev.successRate.slice(-29), successRate],
          retrying: [...prev.retrying.slice(-29), retrying],
          unknown: [...prev.unknown.slice(-29), unknown],
          deadLettered: [...prev.deadLettered.slice(-29), deadLettered],
          duplicates: [...prev.duplicates.slice(-29), duplicates]
        }));
      }
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
        // Detect state transitions to trigger highlight animation
        const changedIds = new Set();
        res.content.forEach((pay) => {
          const prevStatus = prevStatusesRef.current[pay.id];
          if (prevStatus && prevStatus !== pay.status) {
            changedIds.add(pay.id);
          }
          prevStatusesRef.current[pay.id] = pay.status;
        });

        if (changedIds.size > 0) {
          setHighlightedRowIds(changedIds);
          setTimeout(() => setHighlightedRowIds(new Set()), 1800);
        }

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

  // Form Validation
  const validateForm = () => {
    const errors = {};
    if (!merchantRef.trim()) errors.merchantRef = 'Merchant reference is required';
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) errors.amount = 'Amount must be greater than zero';
    if (!currency || currency.length !== 3) errors.currency = 'Must be a 3-letter currency code (e.g. INR)';
    if (mode === 'PROTECTED' && !idempotencyKey.trim()) errors.idempotencyKey = 'Idempotency Key is required in PROTECTED mode';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle single payment submit
  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setSubmitResult(null);
    setDoubleSubmitResult(null);

    try {
      const payload = {
        merchantRef: merchantRef.trim(),
        amount: parseFloat(amount),
        currency: currency.toUpperCase(),
        mode
      };
      const keyToSend = mode === 'PROTECTED' ? idempotencyKey.trim() : null;
      const res = await api.createPayment(payload, keyToSend);

      setSubmitResult({
        success: true,
        payment: res,
        message: `Payment created with status ${res.status}!`
      });
      toast.success(`Payment created successfully with ID ${res.id.substring(0, 8)}...`);

      // Refresh fresh keys
      setMerchantRef(generateRandomOrderRef());
      setIdempotencyKey(generateRandomKey());
      fetchPayments(false);
      fetchMetrics();
    } catch (err) {
      setSubmitResult({
        success: false,
        message: err.message || 'Payment submission failed'
      });
      toast.error(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle "Send twice at once" concurrent submission
  const handleDoubleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    setSubmitResult(null);
    setDoubleSubmitResult(null);

    const payload = {
      merchantRef: merchantRef.trim(),
      amount: parseFloat(amount),
      currency: currency.toUpperCase(),
      mode
    };
    const keyToSend = mode === 'PROTECTED' ? idempotencyKey.trim() : null;

    try {
      const [res1, res2] = await Promise.all([
        api.createPayment(payload, keyToSend),
        api.createPayment(payload, keyToSend)
      ]);

      const samePayment = res1.id === res2.id;
      setDoubleSubmitResult({
        success: true,
        res1,
        res2,
        samePayment
      });

      if (samePayment) {
        toast.success('Idempotency verified: Both requests mapped to the exact same payment!');
      } else {
        toast.warning('Warning: Two distinct payments were created (NAIVE mode behavior)');
      }

      setMerchantRef(generateRandomOrderRef());
      setIdempotencyKey(generateRandomKey());
      fetchPayments(false);
      fetchMetrics();
    } catch (err) {
      setDoubleSubmitResult({
        success: false,
        message: err.message || 'Concurrent submission encountered an error'
      });
      toast.error(err.message || 'Double submission error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter and sort payments in memory for instant responsiveness
  const filteredPayments = useMemo(() => {
    let result = [...payments];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          (p.merchantRef && p.merchantRef.toLowerCase().includes(q)) ||
          (p.id && p.id.toLowerCase().includes(q))
      );
    }
    // Sorting
    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (sortField === 'amount') {
        valA = Number(valA);
        valB = Number(valB);
      }
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [payments, searchQuery, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Status Filter Tabs
  const statusTabs = [
    { id: 'ALL', label: 'All Statuses' },
    { id: 'SUCCESS', label: 'Success', count: metrics?.statusCounts?.SUCCESS },
    { id: 'PROCESSING', label: 'Processing', count: metrics?.statusCounts?.PROCESSING },
    { id: 'RETRYING', label: 'Retrying', count: metrics?.statusCounts?.RETRYING },
    { id: 'UNKNOWN', label: 'Unknown', count: metrics?.statusCounts?.UNKNOWN },
    { id: 'DEAD_LETTERED', label: 'Dead-Lettered', count: metrics?.statusCounts?.DEAD_LETTERED }
  ];

  return (
    <div className="dashboard-view" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
            Payment Reliability Dashboard
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginTop: '4px' }}>
            Real-time idempotency telemetry, state transitions, and distributed recovery monitoring.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button
            variant="secondary"
            size="sm"
            icon={RotateCw}
            onClick={() => {
              fetchMetrics();
              fetchPayments(true);
              toast.info('Refreshed telemetry data');
            }}
          >
            Refresh Telemetry
          </Button>
        </div>
      </div>

      {/* KPI Row (6 cards with count-up & sparklines) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <Stat
          title="Total Payments"
          value={metrics ? (metrics.totalCharges ?? totalElements) : 0}
          subtext="Processed by gateway"
          sparklineData={sparklines.total}
          icon={CreditCard}
        />
        <Stat
          title="Success Rate"
          value={metrics ? (metrics.retrySuccessRate * 100) : 0}
          suffix="%"
          decimals={1}
          subtext="End-to-end resolution"
          highlight="success"
          sparklineData={sparklines.successRate}
          icon={CheckCircle2}
        />
        <Stat
          title="Retrying Now"
          value={metrics?.statusCounts?.RETRYING ?? 0}
          subtext="Active backoff loop"
          highlight={metrics?.statusCounts?.RETRYING > 0 ? 'warning' : undefined}
          sparklineData={sparklines.retrying}
          icon={RefreshCw}
        />
        <Stat
          title="Unknown (Stuck)"
          value={metrics?.statusCounts?.UNKNOWN ?? metrics?.stuckUnknownCount ?? 0}
          subtext="Awaiting reconciliation"
          highlight={metrics?.statusCounts?.UNKNOWN > 0 ? 'info' : undefined}
          sparklineData={sparklines.unknown}
          icon={HelpCircle}
        />
        <Stat
          title="Dead-Lettered"
          value={metrics?.statusCounts?.DEAD_LETTERED ?? 0}
          subtext="Requires intervention"
          highlight={metrics?.statusCounts?.DEAD_LETTERED > 0 ? 'danger' : undefined}
          sparklineData={sparklines.deadLettered}
          icon={AlertOctagon}
        />
        <Stat
          title="Duplicate Charges"
          value={metrics?.duplicateOrdersCount ?? metrics?.duplicateCharges ?? 0}
          subtext="Overcharged bank debits"
          highlight={metrics?.duplicateOrdersCount > 0 ? 'danger' : 'success'}
          sparklineData={sparklines.duplicates}
          icon={Zap}
        />
      </div>

      {/* Main Grid: Create Payment Form & Payments Table */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) 1fr', gap: '28px', alignItems: 'start' }}>
        {/* Create Payment Panel */}
        <Card elevated>
          <CardHeader
            title="Dispatch Payment"
            subtitle="Test idempotent submission under live chaos"
          />
          <CardBody>
            <form onSubmit={handleSingleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <Input
                label="Merchant Order Reference"
                value={merchantRef}
                onChange={(e) => setMerchantRef(e.target.value)}
                error={formErrors.merchantRef}
                mono
                required
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '12px' }}>
                <Input
                  label="Amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  error={formErrors.amount}
                  required
                />
                <Select
                  label="Currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  options={[
                    { value: 'INR', label: 'INR (₹)' },
                    { value: 'USD', label: 'USD ($)' },
                    { value: 'EUR', label: 'EUR (€)' }
                  ]}
                />
              </div>

              <div>
                <label className="ui-input-label" style={{ marginBottom: '6px', display: 'block' }}>
                  Execution Protocol
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${mode === 'PROTECTED' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setMode('PROTECTED')}
                    style={{ justifyContent: 'center' }}
                  >
                    🛡️ Protected
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${mode === 'NAIVE' ? 'btn-danger' : 'btn-secondary'}`}
                    onClick={() => setMode('NAIVE')}
                    style={{ justifyContent: 'center' }}
                  >
                    ⚠️ Naive
                  </button>
                </div>
              </div>

              {mode === 'PROTECTED' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label className="ui-input-label">Idempotency-Key</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <CopyButton text={idempotencyKey} size="sm" />
                      <button
                        type="button"
                        className="ui-copy-btn"
                        onClick={() => setIdempotencyKey(generateRandomKey())}
                        title="Generate fresh key"
                      >
                        <RefreshCw size={12} />
                        <span>Fresh</span>
                      </button>
                    </div>
                  </div>
                  <Input
                    value={idempotencyKey}
                    onChange={(e) => setIdempotencyKey(e.target.value)}
                    error={formErrors.idempotencyKey}
                    mono
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    PostgreSQL ensures atomic single-execution per key.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                <Button
                  type="submit"
                  variant="primary"
                  loading={submitting}
                  icon={Send}
                  style={{ width: '100%' }}
                >
                  Send Payment
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  disabled={submitting}
                  onClick={handleDoubleSubmit}
                  icon={Zap}
                  style={{ width: '100%', borderColor: 'var(--color-primary-400)' }}
                  title="Fire two identical concurrent requests to verify idempotency replay handling"
                >
                  Send twice at once
                </Button>
              </div>
            </form>

            {/* Twice at once comparison result */}
            {doubleSubmitResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginTop: '20px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}
              >
                {doubleSubmitResult.samePayment ? (
                  <div style={{ background: 'var(--status-success-light)', border: '1px solid var(--status-success-border)', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-success-dark)', fontWeight: 700, fontSize: '0.9rem' }}>
                      <CheckCircle2 size={18} />
                      <span>1 payment created — Idempotency Replay Detected!</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--status-success-dark)', marginTop: '4px' }}>
                      Both concurrent dispatches resolved to identical payment ID. No double debit occurred.
                    </p>
                  </div>
                ) : (
                  <div style={{ background: 'var(--status-failed-light)', border: '1px solid var(--status-failed-border)', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-failed-dark)', fontWeight: 700, fontSize: '0.9rem' }}>
                      <AlertOctagon size={18} />
                      <span>2 payments created — Double Charge Occurred!</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--status-failed-dark)', marginTop: '4px' }}>
                      Naive mode lacked an Idempotency-Key constraint; bank account debited twice for order.
                    </p>
                  </div>
                )}

                {/* Side-by-side Response Comparison */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ padding: '10px', background: 'var(--bg-surface-subtle)', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '0.78rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Response 1 (201 Created)</div>
                    <div style={{ color: 'var(--text-muted)' }}>ID: <span className="font-mono text-primary">{doubleSubmitResult.res1?.id?.substring(0, 8)}...</span></div>
                    <div style={{ color: 'var(--text-muted)' }}>Status: <span className="font-mono">{doubleSubmitResult.res1?.status}</span></div>
                  </div>

                  <div style={{ padding: '10px', background: 'var(--bg-surface-subtle)', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '0.78rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Response 2 ({doubleSubmitResult.samePayment ? '200 OK Replay' : '201 Created'})</div>
                    <div style={{ color: 'var(--text-muted)' }}>ID: <span className="font-mono text-primary">{doubleSubmitResult.res2?.id?.substring(0, 8)}...</span></div>
                    <div style={{ color: 'var(--text-muted)' }}>Status: <span className="font-mono">{doubleSubmitResult.res2?.status}</span></div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Single submit result */}
            {submitResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginTop: '16px', padding: '12px 14px', borderRadius: '8px', background: submitResult.success ? 'var(--status-success-light)' : 'var(--status-failed-light)', border: `1px solid ${submitResult.success ? 'var(--status-success-border)' : 'var(--status-failed-border)'}`, color: submitResult.success ? 'var(--status-success-dark)' : 'var(--status-failed-dark)', fontSize: '0.82rem' }}
              >
                {submitResult.message}
              </motion.div>
            )}
          </CardBody>
        </Card>

        {/* Payments Table Area */}
        <Card>
          <CardHeader
            title="Transactions Ledger"
            subtitle={`${totalElements} total payment intents recorded`}
            action={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Input
                  placeholder="Search merchant ref or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  icon={Search}
                  style={{ width: '220px' }}
                />
                <Select
                  value={modeFilter}
                  onChange={(e) => {
                    setModeFilter(e.target.value);
                    setPage(0);
                  }}
                  options={[
                    { value: 'ALL', label: 'All Modes' },
                    { value: 'PROTECTED', label: 'Protected' },
                    { value: 'NAIVE', label: 'Naive' }
                  ]}
                  style={{ width: '130px' }}
                />
              </div>
            }
          />

          {/* Status Filter Tabs */}
          <div style={{ padding: '0 20px', borderBottom: '1px solid var(--border-subtle)' }}>
            <Tabs
              tabs={statusTabs}
              activeTab={statusFilter}
              onChange={(tabId) => {
                setStatusFilter(tabId);
                setPage(0);
              }}
              variant="underline"
            />
          </div>

          {/* Table Container */}
          <div className="ui-table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="ui-table ui-table-sticky-header">
              <thead>
                <tr>
                  <th onClick={() => handleSort('createdAt')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>Timestamp</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th>ID / Order</th>
                  <th onClick={() => handleSort('amount')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>Amount</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th>Mode</th>
                  <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>Status</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th>Attempts</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {tableLoading ? (
                  <SkeletonTableRows rows={6} cols={7} />
                ) : filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 0 }}>
                      <EmptyState
                        title="No transactions found"
                        description={
                          searchQuery
                            ? `No records matching "${searchQuery}".`
                            : 'Submit a payment from the dispatch panel to start tracking reliability.'
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((pay) => {
                    const isHighlighted = highlightedRowIds.has(pay.id);

                    return (
                      <tr
                        key={pay.id}
                        className={isHighlighted ? 'ui-table-row-highlight' : ''}
                        onClick={() => setSelectedPaymentId(pay.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                          {formatRelativeTime(pay.createdAt)}
                        </td>

                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span className="font-mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {pay.id.substring(0, 8)}...
                              </span>
                              <CopyButton text={pay.id} size="sm" />
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {pay.merchantRef}
                            </span>
                          </div>
                        </td>

                        <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                          {pay.currency} {Number(pay.amount).toFixed(2)}
                        </td>

                        <td>
                          <StatusBadge status={pay.mode} size="sm" showDot={false} />
                        </td>

                        <td>
                          <StatusBadge status={pay.status} size="sm" />
                        </td>

                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {pay.attemptCount ?? 0}
                        </td>

                        <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedPaymentId(pay.id)}
                          >
                            Inspect →
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderTop: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Page {page + 1} of {totalPages} ({totalElements} total)
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Selected Payment Drawer */}
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
