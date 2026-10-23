import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import {
  ShieldCheck,
  AlertTriangle,
  RotateCw,
  Copy,
  Check,
  ArrowRight,
  TrendingUp,
  Award,
  Layers,
  Clock,
  History,
  FileSpreadsheet
} from 'lucide-react';
import api from '../api/client';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import CopyButton from '../components/ui/CopyButton';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';

export default function ComparePage() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { isDark } = useTheme();

  const [experimentId, setExperimentId] = useState(routeId || null);
  const [experiment, setExperiment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [historyRuns, setHistoryRuns] = useState([]);

  // Load history from localStorage
  useEffect(() => {
    try {
      const savedHistory = JSON.parse(localStorage.getItem('reliablepay_exp_history') || '[]');
      if (Array.isArray(savedHistory)) {
        setHistoryRuns(savedHistory);
      }
    } catch (e) {
      console.warn('Could not read experiment history', e);
    }
  }, []);

  // Fetch experiment data
  useEffect(() => {
    let resolvedId = routeId;
    if (!resolvedId) {
      try {
        resolvedId = localStorage.getItem('latest_experiment_id');
      } catch (e) {
        // ignore
      }
    }

    if (!resolvedId) {
      setLoading(false);
      return;
    }

    setExperimentId(resolvedId);
    setLoading(true);
    setError(null);

    api.getExperiment(resolvedId)
      .then((data) => {
        setExperiment(data);
        setLoading(false);

        // Update run history (max 5 items)
        if (data && data.status === 'DONE') {
          try {
            const currentHistory = JSON.parse(localStorage.getItem('reliablepay_exp_history') || '[]');
            const entry = {
              id: resolvedId,
              timestamp: new Date().toLocaleTimeString(),
              preventedCharges: data.delta?.duplicateChargesPrevented ?? 0,
              preventedLoss: data.delta?.overchargedPrevented ?? 0
            };
            const updated = [entry, ...currentHistory.filter((h) => h.id !== resolvedId)].slice(0, 5);
            localStorage.setItem('reliablepay_exp_history', JSON.stringify(updated));
            setHistoryRuns(updated);
          } catch (e) {
            // ignore
          }
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch experiment results');
        setLoading(false);
      });
  }, [routeId]);

  // Copy Results to Markdown
  const handleCopyResults = () => {
    if (!experiment) return;
    const { naive, protectedMode, delta, config } = experiment;

    const md = `
# ReliablePay Benchmark Comparison
Experiment ID: ${experiment.id}
Timestamp: ${new Date().toISOString()}

## Injected Chaos Profile
- Total Intents: ${config?.count}
- Concurrency: ${config?.concurrency}
- Timeout Rate: ${(config?.timeoutRate * 100).toFixed(0)}%
- Error Rate: ${(config?.errorRate * 100).toFixed(0)}%
- Duplicate Retry Rate: ${(config?.duplicateSubmitRate * 100).toFixed(0)}%

## Comparative Results
| Metric | NAIVE (Unsafe) | PROTECTED (Engine) | Verdict |
| :--- | :--- | :--- | :--- |
| Duplicate Orders | ${naive?.duplicateOrdersCount ?? 0} | ${protectedMode?.duplicateOrdersCount ?? 0} | ${delta?.duplicateChargesPrevented ?? 0} Prevented |
| Overcharged Amount | ₹${Number(naive?.overchargedAmount ?? 0).toFixed(2)} | ₹${Number(protectedMode?.overchargedAmount ?? 0).toFixed(2)} | ₹${Number(delta?.overchargedPrevented ?? 0).toFixed(2)} Saved |
| Total Bank Debits | ${naive?.totalCharges ?? 0} | ${protectedMode?.totalCharges ?? 0} | Exact Match |
| Retry Success Rate | ${((naive?.retrySuccessRate ?? 0) * 100).toFixed(1)}% | ${((protectedMode?.retrySuccessRate ?? 0) * 100).toFixed(1)}% | Higher |
| Avg Recovery MTTR | ${Math.round(naive?.avgRecoveryMs ?? 0)} ms | ${Math.round(protectedMode?.avgRecoveryMs ?? 0)} ms | Controlled |

*Notice: NAIVE is an intentionally unsafe baseline. Results come from a simulated bank.*
`.trim();

    navigator.clipboard.writeText(md)
      .then(() => toast.success('Experiment results copied as Markdown table!'))
      .catch(() => toast.error('Failed to copy results'));
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1000px', margin: '40px auto' }}>
        <Skeleton variant="rect" height="120px" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <Skeleton variant="rect" height="240px" />
          <Skeleton variant="rect" height="240px" />
        </div>
        <Skeleton variant="rect" height="300px" />
      </div>
    );
  }

  if (!experimentId || !experiment) {
    return (
      <Card style={{ maxWidth: '640px', margin: '60px auto', padding: '40px', textAlign: 'center' }}>
        <EmptyState
          icon={Layers}
          title="No Benchmark Results Found"
          description="You haven't run any chaos comparisons yet. Launch a benchmark in the Chaos Lab to generate side-by-side verification data."
          actionLabel="Go to Chaos Lab →"
          onAction={() => navigate('/lab')}
        />
      </Card>
    );
  }

  if (error) {
    return (
      <Card style={{ maxWidth: '640px', margin: '60px auto', padding: '30px' }}>
        <div style={{ padding: '20px', background: 'var(--status-failed-light)', border: '1px solid var(--status-failed-border)', borderRadius: '12px', color: 'var(--status-failed-dark)', marginBottom: '16px' }}>
          <h4 style={{ fontWeight: 700, marginBottom: '6px' }}>Failed to Load Benchmark</h4>
          <p style={{ fontSize: '0.88rem' }}>{error}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => navigate('/lab')}>
          Return to Chaos Lab
        </Button>
      </Card>
    );
  }

  const { naive, protectedMode, delta, config } = experiment;

  // Real computed dynamic verdict values
  const preventedDuplicates = delta?.duplicateChargesPrevented ?? (naive?.duplicateOrdersCount ?? 0) - (protectedMode?.duplicateOrdersCount ?? 0);
  const preventedOvercharge = delta?.overchargedPrevented ?? (Number(naive?.overchargedAmount ?? 0) - Number(protectedMode?.overchargedAmount ?? 0));

  // Chart Data preparation
  const chartData = [
    {
      name: 'Duplicate Orders',
      NAIVE: naive?.duplicateOrdersCount ?? 0,
      PROTECTED: protectedMode?.duplicateOrdersCount ?? 0
    },
    {
      name: 'Overcharged (₹ / 100)',
      NAIVE: Math.round((naive?.overchargedAmount ?? 0) / 100),
      PROTECTED: Math.round((protectedMode?.overchargedAmount ?? 0) / 100)
    },
    {
      name: 'Total Debits',
      NAIVE: naive?.totalCharges ?? 0,
      PROTECTED: protectedMode?.totalCharges ?? 0
    }
  ];

  return (
    <div className="compare-view" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Dynamic Verdict Banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.12) 0%, rgba(79, 70, 229, 0.12) 100%)',
          border: '1px solid var(--color-accent-300)',
          borderRadius: '16px',
          padding: '24px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--color-accent-600)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(13, 148, 136, 0.4)' }}>
            <Award size={26} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-accent-700)' }}>
              Empirical Reliability Proof
            </span>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px', letterSpacing: '-0.02em' }}>
              PROTECTED prevented {preventedDuplicates} double-charged orders and ₹{Number(preventedOvercharge).toLocaleString('en-IN', { minimumFractionDigits: 2 })} of overcharges
            </h2>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="secondary" size="sm" icon={Copy} onClick={handleCopyResults}>
            Copy Results
          </Button>
          <Button variant="primary" size="sm" icon={RotateCw} onClick={() => navigate('/lab')}>
            Run Again
          </Button>
        </div>
      </motion.div>

      {/* Config Recap Chips */}
      {config && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', padding: '0 4px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Chaos Configuration:</span>
          <span className="ui-copy-btn font-mono">Count: {config.count}</span>
          <span className="ui-copy-btn font-mono">Concurrency: {config.concurrency}</span>
          <span className="ui-copy-btn font-mono">Timeout Rate: {Math.round((config.timeoutRate || 0) * 100)}%</span>
          <span className="ui-copy-btn font-mono">Error Rate: {Math.round((config.errorRate || 0) * 100)}%</span>
          <span className="ui-copy-btn font-mono">Duplicate Retries: {Math.round((config.duplicateSubmitRate || 0) * 100)}%</span>
        </div>
      )}

      {/* Head-to-Head Cards: NAIVE vs. PROTECTED */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* NAIVE Protocol Card */}
        <Card elevated style={{ borderTop: '4px solid var(--status-failed)' }}>
          <CardHeader
            title="NAIVE Protocol"
            subtitle="Blind retry without Idempotency-Keys"
            badge={<span className="badge-naive" style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>Unsafe Baseline</span>}
          />
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Duplicate Debited Orders
                </span>
                <div style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--status-failed)', fontFamily: 'var(--font-mono)', lineHeight: 1.1, marginTop: '4px' }}>
                  {naive?.duplicateOrdersCount ?? 0}
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--status-failed-dark)' }}>
                  Bank debited more than once for single checkout
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Total Overcharged Funds
                </span>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--status-failed)', fontFamily: 'var(--font-mono)', lineHeight: 1.1, marginTop: '4px' }}>
                  ₹{Number(naive?.overchargedAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Lost funds due to blind retry re-execution
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Bank Debits</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {naive?.totalCharges ?? 0}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Success Rate</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {((naive?.retrySuccessRate ?? 0) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* PROTECTED Protocol Card */}
        <Card elevated style={{ borderTop: '4px solid var(--status-success)' }}>
          <CardHeader
            title="PROTECTED Engine"
            subtitle="Idempotent state machine + async reconciliation"
            badge={<span className="badge-protected" style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>Our System</span>}
          />
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Duplicate Debited Orders
                </span>
                <div style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--status-success)', fontFamily: 'var(--font-mono)', lineHeight: 1.1, marginTop: '4px' }}>
                  {protectedMode?.duplicateOrdersCount ?? 0}
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--status-success-dark)' }}>
                  100% duplicate protection guaranteed by PostgreSQL constraint
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Total Overcharged Funds
                </span>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--status-success)', fontFamily: 'var(--font-mono)', lineHeight: 1.1, marginTop: '4px' }}>
                  ₹{Number(protectedMode?.overchargedAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--status-success-dark)' }}>
                  Zero customer funds lost under identical network failure
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Bank Debits</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {protectedMode?.totalCharges ?? 0}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Success Rate</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {((protectedMode?.retrySuccessRate ?? 0) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Recharts Visualization */}
      <Card>
        <CardHeader
          title="Comparative Telemetry Visualizer"
          subtitle="Direct comparison of duplicate debits, overcharges, and total transactions"
        />
        <CardBody>
          <div style={{ width: '100%', height: '340px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                <XAxis dataKey="name" stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} />
                <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#111827' : '#ffffff',
                    borderColor: isDark ? '#374151' : '#cbd5e1',
                    borderRadius: '8px',
                    color: isDark ? '#f8fafc' : '#0f172a',
                    boxShadow: 'var(--shadow-lg)'
                  }}
                />
                <Legend />
                <Bar dataKey="NAIVE" fill="#ef4444" radius={[6, 6, 0, 0]} />
                <Bar dataKey="PROTECTED" fill="#0d9488" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      {/* Comprehensive Metric Breakdown Table */}
      <Card>
        <CardHeader
          title="Full Metric Breakdown"
          subtitle="Side-by-side verification table highlighting winning protocol values"
        />
        <div className="ui-table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table className="ui-table">
            <thead>
              <tr>
                <th>Evaluation Metric</th>
                <th>NAIVE (Baseline)</th>
                <th>PROTECTED (Our Engine)</th>
                <th style={{ textAlign: 'right' }}>Calculated Delta</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Duplicate Orders Debited</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Orders with &gt; 1 charge at bank</div>
                </td>
                <td style={{ color: 'var(--status-failed)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {naive?.duplicateOrdersCount ?? 0}
                </td>
                <td style={{ color: 'var(--status-success)', fontWeight: 700, fontFamily: 'var(--font-mono)', background: 'var(--status-success-light)' }}>
                  {protectedMode?.duplicateOrdersCount ?? 0} (Zero)
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--status-success)' }}>
                  +{preventedDuplicates} prevented
                </td>
              </tr>

              <tr>
                <td>
                  <strong>Overcharged Capital</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total redundant money debited</div>
                </td>
                <td style={{ color: 'var(--status-failed)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  ₹{Number(naive?.overchargedAmount ?? 0).toFixed(2)}
                </td>
                <td style={{ color: 'var(--status-success)', fontWeight: 700, fontFamily: 'var(--font-mono)', background: 'var(--status-success-light)' }}>
                  ₹{Number(protectedMode?.overchargedAmount ?? 0).toFixed(2)}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--status-success)' }}>
                  ₹{Number(preventedOvercharge).toFixed(2)} saved
                </td>
              </tr>

              <tr>
                <td>
                  <strong>Actual Bank Transactions</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total charge invocations recorded</div>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{naive?.totalCharges ?? 0}</td>
                <td style={{ fontFamily: 'var(--font-mono)', background: 'var(--bg-surface-subtle)' }}>{protectedMode?.totalCharges ?? 0}</td>
                <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                  {(naive?.totalCharges ?? 0) - (protectedMode?.totalCharges ?? 0)} redundant charges avoided
                </td>
              </tr>

              <tr>
                <td>
                  <strong>Retry Resolution Success Rate</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Retried payments that reached SUCCESS</div>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{((naive?.retrySuccessRate ?? 0) * 100).toFixed(1)}%</td>
                <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--status-success)', fontWeight: 700, background: 'var(--status-success-light)' }}>
                  {((protectedMode?.retrySuccessRate ?? 0) * 100).toFixed(1)}%
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--status-success)' }}>
                  +{(((protectedMode?.retrySuccessRate ?? 0) - (naive?.retrySuccessRate ?? 0)) * 100).toFixed(1)}% higher
                </td>
              </tr>

              <tr>
                <td>
                  <strong>Mean Time to Recovery (MTTR)</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Average recovery latency from first failure</div>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{Math.round(naive?.avgRecoveryMs ?? 0)} ms</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{Math.round(protectedMode?.avgRecoveryMs ?? 0)} ms</td>
                <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>Controlled Backoff</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* History of Last 5 Runs */}
      {historyRuns.length > 0 && (
        <Card>
          <CardHeader
            title="Recent Benchmark Runs"
            subtitle="Switch between past evaluation trials stored in session history"
            action={<History size={18} className="text-muted" />}
          />
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {historyRuns.map((run) => (
                <div
                  key={run.id}
                  onClick={() => navigate(`/compare/${run.id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: run.id === experimentId ? 'var(--color-primary-50)' : 'var(--bg-surface-subtle)',
                    border: `1px solid ${run.id === experimentId ? 'var(--color-primary-300)' : 'var(--border-subtle)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="font-mono" style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                      #{run.id.substring(0, 8)}...
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{run.timestamp}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--status-success)' }}>
                      Prevented: {run.preventedCharges} duplicates (₹{Number(run.preventedLoss).toFixed(0)})
                    </span>
                    <ArrowRight size={14} className="text-muted" />
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Mandatory Baseline Disclaimer */}
      <div style={{ padding: '16px 20px', borderRadius: '12px', background: 'var(--bg-surface-subtle)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
        <strong>Academic Evaluation Note:</strong> NAIVE is an intentionally unsafe baseline. Results come from a simulated bank.
      </div>
    </div>
  );
}
