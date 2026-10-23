import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section style={{ textAlign: 'center', padding: '60px 0 40px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '9999px', background: 'var(--accent-50)', border: '1px solid var(--accent-100)', color: 'var(--accent-600)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '20px' }}>
          <span>🛡️</span>
          <span>Reliable Payment Processing Engine</span>
        </div>

        <h1 style={{ fontSize: 'clamp(2.4rem, 5vw, 3.6rem)', fontWeight: 800, color: 'var(--primary-900)', letterSpacing: '-0.03em', lineHeight: 1.15, maxWidth: '850px', margin: '0 auto 18px' }}>
          Payments that survive failure
        </h1>

        <p style={{ fontSize: '1.2rem', color: 'var(--primary-600)', maxWidth: '720px', margin: '0 auto 32px', lineHeight: 1.6 }}>
          A fault-tolerant payment gateway engine demonstrating zero duplicate charges and automated reconciliation under chaotic network failure.
        </p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '48px' }}>
          <Link to="/dashboard" className="btn btn-primary btn-lg">
            Open dashboard →
          </Link>
          <Link to="/lab" className="btn btn-accent btn-lg">
            ⚡ Run the chaos lab
          </Link>
        </div>

        {/* Visual of payment journey */}
        <div style={{ background: '#ffffff', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '28px 24px', boxShadow: 'var(--shadow-md)', maxWidth: '960px', margin: '0 auto' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '20px', textAlign: 'center' }}>
            Visual: Anatomy of a Protected Transaction Through Chaos
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
            {/* Step 1 */}
            <div style={{ flex: '1', minWidth: '130px', textAlign: 'center', padding: '12px 8px', background: 'var(--bg-page)', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
              <span className="badge badge-INITIATED">INITIATED</span>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary-800)', marginTop: '8px' }}>1. Client Submit</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Idempotency-Key generated</div>
            </div>

            <div style={{ color: 'var(--text-dim)', fontWeight: 700 }}>→</div>

            {/* Step 2 */}
            <div style={{ flex: '1', minWidth: '130px', textAlign: 'center', padding: '12px 8px', background: 'var(--bg-page)', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
              <span className="badge badge-PROCESSING">PROCESSING</span>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary-800)', marginTop: '8px' }}>2. Bank Call</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Attempt 1 dispatched</div>
            </div>

            <div style={{ color: 'var(--text-dim)', fontWeight: 700 }}>→</div>

            {/* Step 3 */}
            <div style={{ flex: '1', minWidth: '130px', textAlign: 'center', padding: '12px 8px', background: '#fffbeb', borderRadius: '10px', border: '1px solid #fef3c7' }}>
              <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700 }}>TIMEOUT</span>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#92400e', marginTop: '8px' }}>3. Socket Hang</div>
              <div style={{ fontSize: '0.7rem', color: '#b45309' }}>Outcome ambiguous</div>
            </div>

            <div style={{ color: 'var(--text-dim)', fontWeight: 700 }}>→</div>

            {/* Step 4 */}
            <div style={{ flex: '1', minWidth: '130px', textAlign: 'center', padding: '12px 8px', background: '#f5f3ff', borderRadius: '10px', border: '1px solid #ddd6fe' }}>
              <span className="badge badge-UNKNOWN">UNKNOWN</span>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5b21b6', marginTop: '8px' }}>4. Reconcile</div>
              <div style={{ fontSize: '0.7rem', color: '#7c3aed' }}>Worker checks bank status</div>
            </div>

            <div style={{ color: 'var(--text-dim)', fontWeight: 700 }}>→</div>

            {/* Step 5 */}
            <div style={{ flex: '1', minWidth: '130px', textAlign: 'center', padding: '12px 8px', background: '#ecfdf5', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
              <span className="badge badge-SUCCESS">SUCCESS</span>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#065f46', marginTop: '8px' }}>5. Zero Duplicates</div>
              <div style={{ fontSize: '0.7rem', color: '#047857' }}>Debit verified, funds saved</div>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section style={{ padding: '60px 0 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-900)' }}>
            The Three Fatal Flaws in Naive Gateways
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '6px' }}>
            Standard payment architectures fail silently under real-world network fluctuations.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          <div className="card" style={{ borderTop: '4px solid #ef4444' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '12px' }}>💸</div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px', color: 'var(--primary-900)' }}>
              1. Duplicate Charges
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--primary-600)', lineHeight: 1.6 }}>
              When a bank request times out, naive systems blindly retry. If the bank actually charged the card during the timeout, each retry debits the customer a second or third time.
            </p>
          </div>

          <div className="card" style={{ borderTop: '4px solid #f59e0b' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '12px' }}>⏳</div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px', color: 'var(--primary-900)' }}>
              2. Stuck & Orphaned Orders
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--primary-600)', lineHeight: 1.6 }}>
              Transient network errors or server crashes leave transactions in ambiguous states indefinitely. Without scheduled background reconciliation, money is deducted but orders never fulfill.
            </p>
          </div>

          <div className="card" style={{ borderTop: '4px solid #8b5cf6' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '12px' }}>📜</div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px', color: 'var(--primary-900)' }}>
              3. Zero Audit Trail
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--primary-600)', lineHeight: 1.6 }}>
              Without immutable state transition logging and optimistic concurrency controls, multiple threads corrupt payment states and customer dispute resolution becomes impossible.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section style={{ padding: '60px 0 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-900)' }}>
            How ReliablePay Solves It in 4 Steps
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '6px' }}>
            Formal state modeling combined with ground-truth verification ensures correctness under all failure modes.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
          <div className="card" style={{ background: '#fff' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-900)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, marginBottom: '14px' }}>
              1
            </div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '8px' }}>Idempotency Layer</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Every transaction mandates an <code>Idempotency-Key</code>. Replayed or concurrent requests return the original record without creating duplicate payments.
            </p>
          </div>

          <div className="card" style={{ background: '#fff' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent-600)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, marginBottom: '14px' }}>
              2
            </div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '8px' }}>Safe Retry Engine</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Exponential backoff with jitter and capped attempts isolates transient errors. Row-level <code>SKIP LOCKED</code> prevents thundering herds.
            </p>
          </div>

          <div className="card" style={{ background: '#fff' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#7c3aed', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, marginBottom: '14px' }}>
              3
            </div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '8px' }}>Reconcile Unknowns</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              On timeout, status enters <code>UNKNOWN</code>. A scheduled worker queries bank ground truth: if charged, marked <code>SUCCESS</code>; if uncharged, safe to retry.
            </p>
          </div>

          <div className="card" style={{ background: '#fff' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#059669', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, marginBottom: '14px' }}>
              4
            </div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '8px' }}>Measure & Prove</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Run live experiments in the Chaos Lab. Compare NAIVE vs PROTECTED protocols head-to-head on identical chaos workloads.
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ padding: '60px 0 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-900)' }}>
            Production-Grade Reliability Architecture
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div className="card">
            <h4 style={{ fontWeight: 700, marginBottom: '6px' }}>🔒 Optimistic Concurrency Control</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Entity versioning eliminates lost updates when concurrent webhooks, retries, and worker threads target the same record simultaneously.
            </p>
          </div>

          <div className="card">
            <h4 style={{ fontWeight: 700, marginBottom: '6px' }}>📦 Dead-Letter Queue & 1-Click Replay</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Transactions that exceed 4 attempts are safely quarantined as <code>DEAD_LETTERED</code>, inspectable in the UI, and requeuable with one click.
            </p>
          </div>

          <div className="card">
            <h4 style={{ fontWeight: 700, marginBottom: '6px' }}>🧪 In-Flight Chaos Fault Injection</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Configurable probability sliders inject HTTP 500 server errors, 503 channel negotiation drops, and 2,000ms read timeouts at the simulated bank.
            </p>
          </div>

          <div className="card">
            <h4 style={{ fontWeight: 700, marginBottom: '6px' }}>📑 Immutable Audit Event Stream</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Every single state transition records timestamped event rows with reasons, latencies, and attempt counts for banking compliance.
            </p>
          </div>

          <div className="card">
            <h4 style={{ fontWeight: 700, marginBottom: '6px' }}>⚡ Non-Blocking Async Orchestration</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              External bank I/O is held outside database transactions, preventing connection pool exhaustion during downstream banking latencies.
            </p>
          </div>

          <div className="card">
            <h4 style={{ fontWeight: 700, marginBottom: '6px' }}>📊 Live Empirical Metrics API</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Instant metric aggregation calculates MTTR (Mean Time to Recovery), retry success rates, stuck payment counts, and customer overcharges.
            </p>
          </div>
        </div>
      </section>

      {/* Naive vs Protected Teaser */}
      <section style={{ padding: '60px 0 40px' }}>
        <div className="card" style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#fff', padding: '36px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-400)', background: 'rgba(20, 184, 166, 0.15)', padding: '4px 10px', borderRadius: '9999px' }}>
                Example Run Benchmark
              </span>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '10px' }}>
                NAIVE vs. PROTECTED Under 30% Bank Timeouts
              </h3>
            </div>
            <Link to="/lab" className="btn btn-accent btn-sm">
              Replicate in Chaos Lab →
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f87171', textTransform: 'uppercase' }}>NAIVE Protocol</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fca5a5', margin: '8px 0' }}>74 Duplicate Orders</div>
              <p style={{ fontSize: '0.85rem', color: '#fecaca', lineHeight: 1.5 }}>
                ₹9,900 overcharged across 200 orders due to blind retries and lack of idempotency keys.
              </p>
            </div>

            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase' }}>PROTECTED Protocol</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#6ee7b7', margin: '8px 0' }}>0 Duplicate Orders</div>
              <p style={{ fontSize: '0.85rem', color: '#a7f3d0', lineHeight: 1.5 }}>
                ₹0 overcharged. 100% of orders recovered cleanly via idempotency and scheduled bank reconciliation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Strip */}
      <section style={{ padding: '40px 0 60px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary-900)' }}>System Architecture</h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ padding: '14px 20px', background: '#fff', border: '1px solid var(--border-light)', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--primary-800)', boxShadow: 'var(--shadow-sm)' }}>
            Client (React / Vite)
          </div>
          <span style={{ color: 'var(--text-dim)', fontWeight: 700 }}>→</span>
          <div style={{ padding: '14px 20px', background: '#fff', border: '1px solid var(--border-light)', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--primary-800)', boxShadow: 'var(--shadow-sm)' }}>
            Payment Service (Spring Boot 3)
          </div>
          <span style={{ color: 'var(--text-dim)', fontWeight: 700 }}>→</span>
          <div style={{ padding: '14px 20px', background: '#fff', border: '1px solid var(--border-light)', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--primary-800)', boxShadow: 'var(--shadow-sm)' }}>
            Mock Bank (Chaos Injection)
          </div>
          <span style={{ color: 'var(--text-dim)', fontWeight: 700 }}>→</span>
          <div style={{ padding: '14px 20px', background: '#fff', border: '1px solid var(--border-light)', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--primary-800)', boxShadow: 'var(--shadow-sm)' }}>
            PostgreSQL (ACID & Audit)
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-light)', padding: '36px 0', marginTop: '20px', textAlign: 'center' }}>
        <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary-800)' }}>
          Design Project, Alliance University. Simulated bank, no real money.
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>
          Team: Kousik, Shawarima, Rashmi, Nehaa
        </p>
      </footer>
    </div>
  );
}
