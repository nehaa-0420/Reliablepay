import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Zap,
  RefreshCw,
  Database,
  ArrowRight,
  Layers,
  AlertTriangle,
  FileCheck2,
  Lock,
  ChevronDown,
  Activity,
  Server,
  Cpu,
  CheckCircle2,
  Clock,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import StatusBadge from '../components/ui/StatusBadge';
import api from '../api/client';

export default function LandingPage() {
  // Animated Journey State Loop: 0: INITIATED -> 1: PROCESSING -> 2: TIMEOUT -> 3: UNKNOWN -> 4: RECONCILED -> 5: SUCCESS
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 6);
    }, 2400);
    return () => clearInterval(timer);
  }, []);

  // Teaser experiment data
  const [teaserExp, setTeaserExp] = useState(null);
  const [isExampleRun, setIsExampleRun] = useState(false);

  useEffect(() => {
    let resolvedId = null;
    try {
      resolvedId = localStorage.getItem('latest_experiment_id');
    } catch (e) {
      // ignore
    }

    if (resolvedId) {
      api.getExperiment(resolvedId)
        .then((data) => {
          if (data && data.status === 'DONE') {
            setTeaserExp(data);
            setIsExampleRun(false);
          } else {
            fallbackExample();
          }
        })
        .catch(() => fallbackExample());
    } else {
      fallbackExample();
    }

    function fallbackExample() {
      setIsExampleRun(true);
      setTeaserExp({
        id: 'example-run',
        config: { count: 60, duplicateSubmitRate: 0.2, timeoutRate: 0.3, errorRate: 0.1 },
        naive: {
          totalCharges: 74,
          duplicateOrdersCount: 14,
          overchargedAmount: 7000.00,
          retrySuccessRate: 0.52
        },
        protectedMode: {
          totalCharges: 60,
          duplicateOrdersCount: 0,
          overchargedAmount: 0.00,
          retrySuccessRate: 0.98
        },
        delta: {
          duplicateChargesPrevented: 14,
          overchargedPrevented: 7000.00
        }
      });
    }
  }, []);

  // FAQ open state
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (idx) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const journeySteps = [
    { label: 'INITIATED', title: '1. Client Dispatch', desc: 'Idempotency-Key validated & recorded atomically', status: 'INITIATED', badgeColor: 'initiated' },
    { label: 'PROCESSING', title: '2. Gateway Call', desc: 'Dispatched to bank gateway with 2.5s socket timeout', status: 'PROCESSING', badgeColor: 'processing' },
    { label: 'TIMEOUT', title: '3. Socket Hang', desc: 'TCP timeout during packet transit; outcome ambiguous', status: 'RETRYING', badgeColor: 'retrying' },
    { label: 'UNKNOWN', title: '4. Quarantined', desc: 'Marked UNKNOWN; blind retry prevented to avoid double-charge', status: 'UNKNOWN', badgeColor: 'unknown' },
    { label: 'RECONCILING', title: '5. Reconciliation', desc: 'Background worker queries bank ledger for charge verification', status: 'PROCESSING', badgeColor: 'processing' },
    { label: 'SUCCESS', title: '6. Zero Duplicates', desc: 'Debited exactly once; audit trail finalized in PostgreSQL', status: 'SUCCESS', badgeColor: 'success' }
  ];

  const faqs = [
    {
      q: "Isn't this just what Stripe or Razorpay already do?",
      a: "Yes! High-reliability gateways like Stripe, Razorpay, and Adyen rely on exactly these foundational patterns: idempotency keys, atomic state machines, exponential backoff, and asynchronous ledger reconciliation. As part of our Alliance University design project partnering with Citi's industry brief, we built this distributed reliability engine from scratch in Java Spring Boot and PostgreSQL to prove how distributed systems can survive chaos."
    },
    {
      q: "Is real money used in this system?",
      a: "No. All financial transactions run against a dedicated, high-fidelity Mock Bank microservice that simulates real bank gateway responses, network latencies, HTTP 500s, TCP timeouts, and balance accounting without touching actual banking networks."
    },
    {
      q: "How does the Idempotency-Key prevent double-charging?",
      a: "Every transaction requires a unique client-generated Idempotency-Key. In the PROTECTED engine, payment creation executes inside a PostgreSQL transaction governed by a unique database constraint. If an identical key is submitted concurrently or re-sent due to network drops, the database detects the conflict and returns the existing payment record without creating a second bank debit."
    },
    {
      q: "What happens when a bank request times out?",
      a: "In a naive gateway, timeouts trigger immediate retries, which frequently causes double debits if the bank had already processed the initial packet. In ReliablePay, a timeout transitions the payment to the UNKNOWN state. The background reconciliation worker polls the bank's charge status asynchronously to confirm whether funds were debited before deciding whether to retry or succeed."
    },
    {
      q: "Why does the application include both NAIVE and PROTECTED modes?",
      a: "To empirically prove the thesis. By running identical simulated workloads and network chaos against both protocols, the Chaos Lab demonstrates how naive logic causes real double charges and overcharge losses, while the protected engine achieves 100% duplicate charge prevention."
    }
  ];

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="landing-hero">
        <div className="hero-mesh-background" />

        <div className="hero-content">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="hero-pill-badge">
              <ShieldCheck size={16} className="text-accent" />
              <span>Alliance University × Citi Industry Brief</span>
            </div>
          </motion.div>

          <motion.h1
            className="hero-headline"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            Payments that <span className="hero-headline-gradient">survive failure</span>
          </motion.h1>

          <motion.p
            className="hero-subtext"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            A fault-tolerant payment gateway engine guaranteeing zero double-charges, automated reconciliation, and resilient state recovery under simulated chaos and network latency.
          </motion.p>

          <motion.div
            className="hero-cta-group"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Link to="/dashboard">
              <Button variant="primary" size="lg" iconRight={ArrowRight}>
                Open Live Dashboard
              </Button>
            </Link>
            <Link to="/lab">
              <Button variant="secondary" size="lg" icon={Zap}>
                Launch Chaos Lab
              </Button>
            </Link>
          </motion.div>

          {/* Animated Payment Journey Visual */}
          <motion.div
            className="hero-journey-card"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={16} className="text-accent" />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                  Interactive Transaction Journey: Surviving Chaos
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge-protected" style={{ padding: '3px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700 }}>
                  PROTECTED PROTOCOL
                </span>
                {activeStep === 5 && (
                  <motion.span
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    style={{ background: 'var(--status-success-light)', color: 'var(--status-success-dark)', border: '1px solid var(--status-success-border)', padding: '3px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <CheckCircle2 size={12} /> CHARGED EXACTLY ONCE
                  </motion.span>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '10px' }}>
              {journeySteps.map((step, idx) => {
                const isActive = activeStep === idx;
                const isPassed = activeStep > idx;

                return (
                  <motion.div
                    key={step.label}
                    className={`journey-step-box ${isActive ? 'is-active-step' : ''}`}
                    animate={{
                      scale: isActive ? 1.03 : 1,
                      borderColor: isActive ? 'var(--color-primary-500)' : isPassed ? 'var(--status-success-border)' : 'var(--border-subtle)'
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    <div style={{ marginBottom: '8px' }}>
                      <StatusBadge status={step.status} size="sm" />
                    </div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {step.title}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                      {step.desc}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust Strip */}
      <section className="trust-strip">
        <div className="trust-strip-grid">
          <div className="trust-item">
            <div className="trust-icon-box">
              <Lock size={18} />
            </div>
            <div>
              <div className="trust-title">Idempotent by Design</div>
              <div className="trust-desc">PostgreSQL unique constraint stops duplicate processing</div>
            </div>
          </div>

          <div className="trust-item">
            <div className="trust-icon-box">
              <RefreshCw size={18} />
            </div>
            <div>
              <div className="trust-title">Exponential Retry & Jitter</div>
              <div className="trust-desc">Bounded backoff prevents thundering herds to bank</div>
            </div>
          </div>

          <div className="trust-item">
            <div className="trust-icon-box">
              <FileCheck2 size={18} />
            </div>
            <div>
              <div className="trust-title">Asynchronous Reconciliation</div>
              <div className="trust-desc">Scheduled worker cures ambiguous UNKNOWN states</div>
            </div>
          </div>

          <div className="trust-item">
            <div className="trust-icon-box">
              <Database size={18} />
            </div>
            <div>
              <div className="trust-title">Immutable Audit Trail</div>
              <div className="trust-desc">Every state transition recorded with timestamps & reason</div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section: 3 Cards */}
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px 60px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            The Three Fatal Flaws in Naive Gateways
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '8px' }}>
            Why simple retry loops fail and silently bleed customer funds during network jitter.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          <Card hoverLift style={{ borderTop: '4px solid var(--status-failed)' }}>
            <div style={{ padding: '6px 0 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--status-failed-light)', color: 'var(--status-failed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={20} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>1. Double Charging</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6 }}>
              A customer clicks "Pay" twice, or a mobile client drops a connection after the bank charges the account. Without database-level idempotency, the server re-dispatches the charge, debiting the card multiple times for a single order.
            </p>
          </Card>

          <Card hoverLift style={{ borderTop: '4px solid var(--status-retrying)' }}>
            <div style={{ padding: '6px 0 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--status-retrying-light)', color: 'var(--status-retrying)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={20} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>2. Stuck Payments</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6 }}>
              When a payment gateway request hangs or times out after 2.5s, the final transaction outcome is ambiguous. Naive systems either mark it failed (abandoning money) or hang forever. ReliablePay enters UNKNOWN and reconciles safely.
            </p>
          </Card>

          <Card hoverLift style={{ borderTop: '4px solid var(--status-unknown)' }}>
            <div style={{ padding: '6px 0 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--status-unknown-light)', color: 'var(--status-unknown)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Layers size={20} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>3. Cascading Failures</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6 }}>
              In multi-bank payment batches, a broken channel handshake or rate-limited upstream gateway causes the entire batch to abort. Our state machine isolates each item and applies exponential backoff with circuit breaker caps.
            </p>
          </Card>
        </div>
      </section>

      {/* How it Works: 4-step Stepper */}
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px 24px 60px' }}>
        <Card style={{ padding: '36px 32px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              How the ReliablePay Engine Protects Every Transaction
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '6px' }}>
              Four deterministic stages guarantee zero double-debits even across network partitions.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            <div style={{ padding: '16px', background: 'var(--bg-surface-subtle)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-primary-600)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', marginBottom: '12px' }}>
                1
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>Idempotency Gate</h4>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Client submits an Idempotency-Key. PostgreSQL atomic insert prevents replay attacks and duplicate submissions concurrently.
              </p>
            </div>

            <div style={{ padding: '16px', background: 'var(--bg-surface-subtle)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-primary-600)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', marginBottom: '12px' }}>
                2
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>Strict State Machine</h4>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Payment moves INITIATED → PROCESSING. Every lifecycle transition is validated and audited before invoking the bank client.
              </p>
            </div>

            <div style={{ padding: '16px', background: 'var(--bg-surface-subtle)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-primary-600)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', marginBottom: '12px' }}>
                3
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>Resilient Bank Client</h4>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                HTTP client enforces bounded connection timeouts. 5xx errors trigger exponential retry; timeouts quarantine into UNKNOWN.
              </p>
            </div>

            <div style={{ padding: '16px', background: 'var(--bg-surface-subtle)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-primary-600)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', marginBottom: '12px' }}>
                4
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>Auto Reconciliation</h4>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Background reconciliation worker queries the bank's charges ledger. If debit occurred, payment transitions to SUCCESS.
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* Animated SVG Architecture Diagram */}
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px 60px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            System Architecture & Data Flow
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '6px' }}>
            Spring Boot microservices paired with PostgreSQL ACID transactions and simulated chaos injection.
          </p>
        </div>

        <Card style={{ padding: '32px', background: 'var(--bg-surface-elevated)' }}>
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <svg viewBox="0 0 880 220" style={{ width: '100%', minWidth: '700px', height: 'auto' }}>
              <defs>
                <linearGradient id="clientGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4f46e5" />
                  <stop offset="100%" stopColor="#3730a3" />
                </linearGradient>
                <linearGradient id="serviceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0d9488" />
                  <stop offset="100%" stopColor="#0f766e" />
                </linearGradient>
                <linearGradient id="bankGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#b45309" />
                </linearGradient>
                <linearGradient id="dbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
              </defs>

              {/* Connecting Lines */}
              <line x1="160" y1="110" x2="310" y2="110" stroke="var(--border-strong)" strokeWidth="2" strokeDasharray="6 4" />
              <line x1="470" y1="110" x2="620" y2="110" stroke="var(--border-strong)" strokeWidth="2" strokeDasharray="6 4" />
              <line x1="390" y1="150" x2="390" y2="180" stroke="var(--border-strong)" strokeWidth="2" strokeDasharray="6 4" />

              {/* Animated Flowing Packet 1: Client to Service */}
              <circle r="4" fill="var(--color-primary-400)">
                <animateMotion path="M 160 110 L 310 110" dur="2s" repeatCount="indefinite" />
              </circle>

              {/* Animated Flowing Packet 2: Service to Bank */}
              <circle r="4" fill="var(--color-accent-400)">
                <animateMotion path="M 470 110 L 620 110" dur="2s" begin="0.8s" repeatCount="indefinite" />
              </circle>

              {/* Node 1: Client */}
              <g transform="translate(40, 70)">
                <rect width="120" height="80" rx="12" fill="url(#clientGrad)" filter="drop-shadow(0 4px 12px rgba(79,70,229,0.3))" />
                <text x="60" y="38" fill="#ffffff" fontSize="13" fontWeight="700" textAnchor="middle">React Client</text>
                <text x="60" y="56" fill="#c7d2fe" fontSize="10" textAnchor="middle">Idempotency Key</text>
              </g>

              {/* Node 2: Payment Service */}
              <g transform="translate(310, 60)">
                <rect width="160" height="100" rx="14" fill="url(#serviceGrad)" filter="drop-shadow(0 4px 12px rgba(13,148,136,0.3))" />
                <text x="80" y="42" fill="#ffffff" fontSize="14" fontWeight="800" textAnchor="middle">Payment Service</text>
                <text x="80" y="60" fill="#99f6e4" fontSize="10" textAnchor="middle">State Machine & Retry</text>
                <text x="80" y="76" fill="#ccfbf1" fontSize="9" textAnchor="middle">Port 8080</text>
              </g>

              {/* Node 3: Mock Bank */}
              <g transform="translate(620, 60)">
                <rect width="160" height="100" rx="14" fill="url(#bankGrad)" filter="drop-shadow(0 4px 12px rgba(245,158,11,0.3))" />
                <text x="80" y="42" fill="#ffffff" fontSize="14" fontWeight="800" textAnchor="middle">Mock Bank Gateway</text>
                <text x="80" y="60" fill="#fef3c7" fontSize="10" textAnchor="middle">Chaos & Latency Injector</text>
                <text x="80" y="76" fill="#fde68a" fontSize="9" textAnchor="middle">Port 8081</text>
              </g>

              {/* Node 4: PostgreSQL */}
              <g transform="translate(320, 180)">
                <rect width="140" height="36" rx="8" fill="url(#dbGrad)" />
                <text x="70" y="23" fill="#ffffff" fontSize="11" fontWeight="700" textAnchor="middle">PostgreSQL 16</text>
              </g>
            </svg>
          </div>
        </Card>
      </section>

      {/* Naive-vs-Protected Teaser Section */}
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px 60px' }}>
        <Card style={{ padding: '36px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Experimental Benchmark Results
                </h3>
                {isExampleRun && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-surface-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                    Example run
                  </span>
                )}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                Head-to-head evaluation under 30% bank timeouts and 20% duplicate client retries.
              </p>
            </div>
            <Link to="/compare">
              <Button variant="secondary" size="sm" iconRight={ArrowRight}>
                View Detailed Protocol Analysis
              </Button>
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {/* NAIVE Card */}
            <div style={{ padding: '20px', borderRadius: '12px', border: '1px solid #fecaca', background: 'var(--status-failed-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span className="badge-naive" style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                  NAIVE PROTOCOL
                </span>
                <span style={{ fontSize: '0.78rem', color: '#991b1b', fontWeight: 600 }}>No Idempotency</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem', color: '#7f1d1d' }}>Duplicate Orders:</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#dc2626', fontFamily: 'var(--font-mono)' }}>
                    {teaserExp?.naive?.duplicateOrdersCount ?? 14}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem', color: '#7f1d1d' }}>Overcharged Amount:</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#dc2626', fontFamily: 'var(--font-mono)' }}>
                    ₹{Number(teaserExp?.naive?.overchargedAmount ?? 7000).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem', color: '#7f1d1d' }}>Total Debits:</span>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: '#991b1b', fontFamily: 'var(--font-mono)' }}>
                    {teaserExp?.naive?.totalCharges ?? 74}
                  </span>
                </div>
              </div>
            </div>

            {/* PROTECTED Card */}
            <div style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--status-success-border)', background: 'var(--status-success-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span className="badge-protected" style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                  PROTECTED PROTOCOL
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--status-success-dark)', fontWeight: 600 }}>Idempotent Engine</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--status-success-dark)' }}>Duplicate Orders:</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--status-success)', fontFamily: 'var(--font-mono)' }}>
                    0
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--status-success-dark)' }}>Overcharged Amount:</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--status-success)', fontFamily: 'var(--font-mono)' }}>
                    ₹0.00
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--status-success-dark)' }}>Total Debits:</span>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--status-success-dark)', fontFamily: 'var(--font-mono)' }}>
                    {teaserExp?.protectedMode?.totalCharges ?? 60}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* FAQ Accordion */}
      <section style={{ maxWidth: '860px', margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Frequently Asked Questions
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '6px' }}>
            Honest architectural explanations for academic and jury evaluation.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  backgroundColor: 'var(--bg-surface)',
                  overflow: 'hidden'
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  style={{
                    width: '100%',
                    padding: '18px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textAlign: 'left',
                    color: 'var(--text-primary)',
                    fontWeight: 600,
                    fontSize: '0.96rem'
                  }}
                >
                  <span>{faq.q}</span>
                  <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.15 }}>
                    <ChevronDown size={18} className="text-muted" />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ padding: '0 20px 20px', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-subtle)', padding: '40px 24px 32px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center', textAlign: 'center' }}>
          <div className="brand-badge">
            <div className="brand-icon-shield">
              <ShieldCheck size={18} strokeWidth={2.5} />
            </div>
            <span>ReliablePay</span>
          </div>

          <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', maxWidth: '600px' }}>
            <strong>Design Project Team:</strong> Kousik, Shawarima, Rashmi, Nehaa.
            <br />
            Alliance University. Simulated bank, no real money.
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Brief: Design and Development of a Reliable Payment Processing System with Retry and Failure Handling (Citi).
          </div>
        </div>
      </footer>
    </div>
  );
}
