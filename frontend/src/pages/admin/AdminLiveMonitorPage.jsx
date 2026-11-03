import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import {
  Radio,
  Play,
  Pause,
  Filter,
  RefreshCw,
  Clock,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Eye,
  Layers
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import Drawer from '../../components/ui/Drawer';
import Tooltip from '../../components/ui/Tooltip';
import PaymentDrawer from '../../components/PaymentDrawer';
import { BASE_URL, getAdminHeaders, api } from '../../api/client';

const PIPELINE_COLUMNS = [
  { key: 'INITIATED', label: 'Initiated', color: 'var(--status-initiated-text)', bg: 'var(--status-initiated-bg)' },
  { key: 'PROCESSING', label: 'Processing', color: 'var(--status-processing-text)', bg: 'var(--status-processing-bg)' },
  { key: 'RETRYING', label: 'Retrying', color: 'var(--status-retrying-text)', bg: 'var(--status-retrying-bg)' },
  { key: 'UNKNOWN', label: 'Unknown (Reconciling)', color: 'var(--status-unknown-text)', bg: 'var(--status-unknown-bg)' },
  { key: 'SUCCESS', label: 'Success', color: 'var(--status-success-text)', bg: 'var(--status-success-bg)' },
  { key: 'DEAD_LETTERED', label: 'Dead Lettered', color: 'var(--status-failed-text)', bg: 'var(--status-failed-bg)' }
];

export default function AdminLiveMonitorPage({ onStreamStatusChange }) {
  // Counters per status
  const [counts, setCounts] = useState({
    INITIATED: 0,
    PROCESSING: 0,
    RETRYING: 0,
    UNKNOWN: 0,
    SUCCESS: 0,
    DEAD_LETTERED: 0
  });

  // Pipeline board items: Map of paymentId -> payment object
  const [pipelineItems, setPipelineItems] = useState({});

  // Live event ticker: array of last 50 transitions
  const [recentEvents, setRecentEvents] = useState([]);

  // Stream state
  const [isPaused, setIsPaused] = useState(false);
  const [streamConnected, setStreamConnected] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Drawer inspection
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);

  // 60-second throughput tracker: array of 60 seconds counts
  const [throughputHistory, setThroughputHistory] = useState(() => Array(60).fill(0));
  const eventCounterRef = useRef(0);
  const ctrlRef = useRef(null);

  // Load initial payments to seed pipeline columns
  const loadInitialPayments = useCallback(async () => {
    try {
      const res = await api.getPayments({ page: 0, size: 50 });
      if (res && res.content) {
        const itemMap = {};
        res.content.forEach(p => {
          itemMap[p.id] = {
            id: p.id,
            merchantRef: p.merchantRef,
            amount: p.amount,
            currency: p.currency,
            status: p.status,
            attemptCount: p.attemptCount || 1,
            mode: p.mode,
            updatedAt: p.updatedAt || p.createdAt
          };
        });
        setPipelineItems(itemMap);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadInitialPayments();
  }, [loadInitialPayments]);

  // Rolling 1-second interval to update throughput history chart
  useEffect(() => {
    const interval = setInterval(() => {
      const currentSecondEvents = eventCounterRef.current;
      eventCounterRef.current = 0;
      setThroughputHistory(prev => [...prev.slice(1), currentSecondEvents]);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Connect to SSE stream via @microsoft/fetch-event-source
  useEffect(() => {
    if (isPaused) {
      if (ctrlRef.current) {
        ctrlRef.current.abort();
      }
      setStreamConnected(false);
      onStreamStatusChange?.('PAUSED');
      return;
    }

    const abortController = new AbortController();
    ctrlRef.current = abortController;
    onStreamStatusChange?.('RECONNECTING');

    const streamUrl = `${BASE_URL}/api/admin/stream`;
    const headers = getAdminHeaders();

    fetchEventSource(streamUrl, {
      signal: abortController.signal,
      headers: {
        ...headers,
        'Accept': 'text/event-stream'
      },
      onopen(response) {
        if (response.ok && response.status === 200) {
          setStreamConnected(true);
          onStreamStatusChange?.('LIVE');
          return Promise.resolve();
        } else if (response.status === 401) {
          onStreamStatusChange?.('OFFLINE');
          throw new Error('Unauthorized');
        } else {
          onStreamStatusChange?.('RECONNECTING');
          throw new Error(`Failed to connect: ${response.status}`);
        }
      },
      onmessage(event) {
        if (!event.data || event.event === 'heartbeat') return;

        try {
          const payload = JSON.parse(event.data);

          if (event.event === 'snapshot') {
            // Snapshot of all status counts and initial recent events
            if (payload.countsByStatus) {
              setCounts(prev => ({ ...prev, ...payload.countsByStatus }));
            }
            if (payload.recentEvents && Array.isArray(payload.recentEvents)) {
              setRecentEvents(payload.recentEvents.slice(0, 50));
            }
          } else if (event.event === 'transition') {
            // Live payment transition event
            eventCounterRef.current += 1;

            const { paymentId, merchantRef, fromStatus, toStatus, detail, occurredAt, attemptCount, amount } = payload;

            // 1. Update status counts
            setCounts(prev => {
              const updated = { ...prev };
              if (fromStatus && updated[fromStatus] !== undefined && updated[fromStatus] > 0) {
                updated[fromStatus] -= 1;
              }
              if (toStatus && updated[toStatus] !== undefined) {
                updated[toStatus] = (updated[toStatus] || 0) + 1;
              }
              return updated;
            });

            // 2. Prepend event to ticker
            setRecentEvents(prev => [payload, ...prev.slice(0, 49)]);

            // 3. Update pipeline board item
            setPipelineItems(prev => ({
              ...prev,
              [paymentId]: {
                ...(prev[paymentId] || {}),
                id: paymentId,
                merchantRef: merchantRef || prev[paymentId]?.merchantRef || 'ORD',
                amount: amount || prev[paymentId]?.amount || 100,
                status: toStatus,
                attemptCount: attemptCount || prev[paymentId]?.attemptCount || 1,
                updatedAt: occurredAt || new Date().toISOString()
              }
            }));
          }
        } catch (e) {
          // ignore parse errors
        }
      },
      onerror(err) {
        setStreamConnected(false);
        onStreamStatusChange?.('RECONNECTING');
        // Let fetchEventSource auto-retry
      }
    });

    return () => {
      abortController.abort();
    };
  }, [isPaused, onStreamStatusChange]);

  // Group pipeline items by status for columns
  const columnData = useMemo(() => {
    const grouped = {
      INITIATED: [],
      PROCESSING: [],
      RETRYING: [],
      UNKNOWN: [],
      SUCCESS: [],
      DEAD_LETTERED: []
    };

    Object.values(pipelineItems).forEach(item => {
      if (grouped[item.status]) {
        grouped[item.status].push(item);
      }
    });

    // Sort items within each column by updatedAt desc
    Object.keys(grouped).forEach(k => {
      grouped[k].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    });

    return grouped;
  }, [pipelineItems]);

  // Compute maximum events/sec for sparkline scaling
  const maxTps = Math.max(1, ...throughputHistory);
  const currentTps = throughputHistory[throughputHistory.length - 1] || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header & Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Radio size={24} color="var(--color-brand-primary)" />
            Real-Time Payment Pipeline Monitor
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
            Streaming live transitions directly from PostgreSQL write-ahead events via Server-Sent Events.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Pause / Resume Button */}
          <Button
            id="stream-pause-toggle-btn"
            variant={isPaused ? 'primary' : 'outline'}
            size="sm"
            icon={isPaused ? <Play size={14} /> : <Pause size={14} />}
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? 'Resume Stream' : 'Pause Stream'}
          </Button>

          {/* Refresh Manual Fetch */}
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw size={14} />}
            onClick={loadInitialPayments}
          >
            Sync Pipeline
          </Button>

          {/* Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={14} color="var(--text-muted)" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Columns</option>
              {PIPELINE_COLUMNS.map(c => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 1: Status Stat Cards (Animated Counters) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '14px'
      }}>
        {PIPELINE_COLUMNS.map(col => {
          const count = counts[col.key] || 0;
          return (
            <Card key={col.key} style={{ padding: '16px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {col.label}
                </span>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: col.color
                }} />
              </div>
              <motion.div
                key={count}
                initial={{ scale: 0.92, opacity: 0.6 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
                style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
              >
                {count.toLocaleString()}
              </motion.div>
            </Card>
          );
        })}
      </div>

      {/* SECTION 4: 60-Second Throughput Mini-Chart */}
      <Card style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={16} color="var(--color-brand-accent)" />
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Real-Time Throughput (Past 60 Seconds)
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Current: <strong style={{ color: 'var(--color-brand-accent)' }}>{currentTps} evt/s</strong></span>
            <span style={{ color: 'var(--text-muted)' }}>Peak: {maxTps} evt/s</span>
          </div>
        </div>

        {/* SVG Sparkline Bar Chart */}
        <div style={{ height: '54px', display: 'flex', alignItems: 'flex-end', gap: '2px', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', padding: '6px' }}>
          {throughputHistory.map((val, idx) => {
            const heightPercent = Math.max(6, (val / maxTps) * 100);
            return (
              <Tooltip key={idx} content={`T-${60 - idx}s: ${val} transitions`} position="top">
                <div
                  style={{
                    flex: 1,
                    height: `${heightPercent}%`,
                    background: val > 0 ? 'var(--color-brand-primary)' : 'var(--border-subtle)',
                    borderRadius: '2px',
                    transition: 'height 0.2s ease'
                  }}
                />
              </Tooltip>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
          <span>60s ago</span>
          <span>30s ago</span>
          <span>Now (Live)</span>
        </div>
      </Card>

      {/* SECTION 2: Kanban Pipeline Board */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="var(--color-brand-primary)" />
            <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
              Live Execution Pipeline Board
            </h2>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Cards transition seamlessly between state columns in real time
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: statusFilter === 'ALL'
            ? 'repeat(auto-fit, minmax(220px, 1fr))'
            : '1fr',
          gap: '14px',
          alignItems: 'start'
        }}>
          {PIPELINE_COLUMNS
            .filter(col => statusFilter === 'ALL' || statusFilter === col.key)
            .map(col => {
              const items = columnData[col.key] || [];
              return (
                <div
                  key={col.key}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '620px',
                    overflow: 'hidden'
                  }}
                >
                  {/* Column Header */}
                  <div style={{
                    padding: '12px 14px',
                    borderBottom: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface-elevated)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: col.color
                      }} />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {col.label}
                      </span>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: col.bg,
                      color: col.color
                    }}>
                      {items.length}
                    </span>
                  </div>

                  {/* Card Stream inside Column */}
                  <div style={{
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    overflowY: 'auto',
                    flex: 1
                  }}>
                    {items.length === 0 ? (
                      <div style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                        No payments in this state
                      </div>
                    ) : (
                      <AnimatePresence mode="popLayout">
                        {items.slice(0, 15).map(item => (
                          <motion.div
                            key={item.id}
                            layout
                            layoutId={item.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            onClick={() => setSelectedPaymentId(item.id)}
                            style={{
                              padding: '12px',
                              borderRadius: 'var(--radius-md)',
                              background: 'var(--bg-surface-elevated)',
                              border: '1px solid var(--border-subtle)',
                              cursor: 'pointer',
                              boxShadow: 'var(--shadow-elevation-1)',
                              transition: 'border-color 0.15s ease, transform 0.15s ease'
                            }}
                            whileHover={{ scale: 1.02, borderColor: 'var(--color-brand-primary)' }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                ₹{Number(item.amount || 0).toLocaleString()}
                              </span>
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: 'var(--bg-surface)',
                                color: 'var(--text-secondary)',
                                border: '1px solid var(--border-subtle)'
                              }}>
                                Try #{item.attemptCount}
                              </span>
                            </div>

                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {item.merchantRef}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                              <code style={{ fontFamily: 'var(--font-mono)' }}>{item.id.slice(0, 8)}...</code>
                              <span>{new Date(item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* SECTION 3: Live Event Ticker (Last 50 Transitions) */}
      <Card style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} color="var(--color-brand-primary)" />
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Live State Transition Ticker (Last 50 Events)
            </span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Ordered newest first • Click event to inspect payment details
          </span>
        </div>

        <div style={{
          maxHeight: '340px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          {recentEvents.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              Waiting for live transaction events...
            </div>
          ) : (
            recentEvents.map((evt, idx) => (
              <div
                key={evt.id || evt.eventId || idx}
                onClick={() => setSelectedPaymentId(evt.paymentId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease'
                }}
              >
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minWidth: '65px' }}>
                  {new Date(evt.occurredAt || evt.createdAt || Date.now()).toLocaleTimeString()}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '180px' }}>
                  <StatusBadge status={evt.fromStatus || 'START'} size="sm" />
                  <ArrowRight size={12} color="var(--text-muted)" />
                  <StatusBadge status={evt.toStatus || 'PROCESSING'} size="sm" />
                </div>

                <div style={{ flex: 1, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {evt.detail || 'State transition recorded'}
                </div>

                <code style={{ fontSize: '11px', color: 'var(--color-brand-accent)', fontFamily: 'var(--font-mono)' }}>
                  {evt.paymentId ? evt.paymentId.slice(0, 8) : ''}...
                </code>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Payment Detail Inspection Drawer */}
      <PaymentDrawer
        paymentId={selectedPaymentId}
        isOpen={Boolean(selectedPaymentId)}
        onClose={() => setSelectedPaymentId(null)}
      />
    </div>
  );
}
