import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function ChaosLabPage() {
  const navigate = useNavigate();

  // Chaos config state
  const [chaos, setChaos] = useState({
    timeoutRate: 0.3,
    errorRate: 0.1,
    channelFailureRate: 0.0,
    chargeOnTimeoutProbability: 0.5,
    latencyMs: 0
  });
  const [chaosLoading, setChaosLoading] = useState(true);
  const [chaosApplying, setChaosApplying] = useState(false);
  const [chaosSuccessMsg, setChaosSuccessMsg] = useState('');

  // Experiment state
  const [expConfig, setExpConfig] = useState({
    count: 60,
    concurrency: 10,
    duplicateSubmitRate: 0.2
  });
  const [activeExpId, setActiveExpId] = useState(null);
  const [expStatus, setExpStatus] = useState(null);
  const [expDurationMs, setExpDurationMs] = useState(0);
  const [expError, setExpError] = useState(null);
  const [startingExp, setStartingExp] = useState(false);

  // Reset modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState('');

  // Fetch chaos config on mount
  useEffect(() => {
    api.getChaosConfig()
      .then((cfg) => {
        if (cfg) {
          setChaos({
            timeoutRate: cfg.timeoutRate ?? 0.3,
            errorRate: cfg.errorRate ?? 0.1,
            channelFailureRate: cfg.channelFailureRate ?? 0.0,
            chargeOnTimeoutProbability: cfg.chargeOnTimeoutProbability ?? 0.5,
            latencyMs: cfg.latencyMs ?? 0
          });
        }
      })
      .catch((err) => console.error('Failed to load chaos config', err))
      .finally(() => setChaosLoading(false));
  }, []);

  // Poll active experiment
  useEffect(() => {
    if (!activeExpId) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await api.getExperiment(activeExpId);
        if (!isMounted) return;

        setExpStatus(res.status);
        if (res.durationMs !== undefined && res.durationMs !== null) {
          setExpDurationMs(res.durationMs);
        }

        if (res.status === 'DONE') {
          clearInterval(interval);
          try {
            localStorage.setItem('latest_experiment_id', activeExpId);
          } catch (e) {
            console.warn('Could not store latest_experiment_id in localStorage', e);
          }
        } else if (res.status === 'FAILED') {
          clearInterval(interval);
          setExpError(res.errorMessage || 'Experiment execution failed');
        }
      } catch (err) {
        console.error('Error polling experiment', err);
      }
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeExpId]);

  // Apply Chaos config
  const handleApplyChaos = async (e) => {
    e.preventDefault();
    setChaosApplying(true);
    setChaosSuccessMsg('');
    try {
      const updated = await api.updateChaosConfig(chaos);
      setChaosSuccessMsg('✓ Chaos parameters applied to mock bank successfully!');
      setTimeout(() => setChaosSuccessMsg(''), 4000);
    } catch (err) {
      alert('Failed to update chaos config: ' + err.message);
    } finally {
      setChaosApplying(false);
    }
  };

  // Launch Experiment
  const handleRunExperiment = async () => {
    setStartingExp(true);
    setExpError(null);
    setExpStatus('RUNNING');
    setExpDurationMs(0);

    const payload = {
      count: parseInt(expConfig.count, 10),
      concurrency: parseInt(expConfig.concurrency, 10),
      duplicateSubmitRate: parseFloat(expConfig.duplicateSubmitRate),
      chaos: {
        timeoutRate: parseFloat(chaos.timeoutRate),
        errorRate: parseFloat(chaos.errorRate),
        channelFailureRate: parseFloat(chaos.channelFailureRate),
        chargeOnTimeoutProbability: parseFloat(chaos.chargeOnTimeoutProbability),
        latencyMs: parseInt(chaos.latencyMs, 10)
      }
    };

    try {
      const res = await api.runExperiment(payload);
      setActiveExpId(res.experimentId);
      try {
        localStorage.setItem('latest_experiment_id', res.experimentId);
      } catch (e) {}
    } catch (err) {
      if (err.status === 409) {
        setExpError('An experiment is already in progress. Please wait for it to complete or reset data.');
      } else {
        setExpError(err.message || 'Failed to start experiment');
      }
      setExpStatus(null);
    } finally {
      setStartingExp(false);
    }
  };

  // Apply Presets
  const applyPreset = (preset) => {
    if (preset === 'quick') {
      setExpConfig({ count: 60, concurrency: 10, duplicateSubmitRate: 0.2 });
      setChaos((prev) => ({ ...prev, timeoutRate: 0.3, errorRate: 0.1, channelFailureRate: 0.0 }));
    } else if (preset === 'full') {
      setExpConfig({ count: 200, concurrency: 10, duplicateSubmitRate: 0.2 });
      setChaos((prev) => ({ ...prev, timeoutRate: 0.3, errorRate: 0.1, channelFailureRate: 0.0 }));
    }
  };

  // Handle Admin Reset
  const handleConfirmReset = async () => {
    setResetting(true);
    try {
      await api.resetSystem();
      setResetMsg('System successfully reset! Cleared all payments, events, idempotency keys, and mock bank charges.');
      setShowResetModal(false);
      setActiveExpId(null);
      setExpStatus(null);
      setTimeout(() => setResetMsg(''), 5000);
    } catch (err) {
      alert('Failed to reset system: ' + err.message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="chaos-lab-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--primary-900)', letterSpacing: '-0.02em' }}>
            Chaos Engineering & Experiment Lab
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Inject downstream network failures and run comparative NAIVE vs. PROTECTED stress tests.
          </p>
        </div>

        <div>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => setShowResetModal(true)}
          >
            🗑️ Reset System Data
          </button>
        </div>
      </div>

      {resetMsg && (
        <div style={{ marginBottom: '20px', padding: '14px 18px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600 }}>
          {resetMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Chaos Configuration Card */}
        <div className="card">
          <h2 className="card-title">Bank Chaos Parameters</h2>
          <p className="card-subtitle">Real-time fault injection at the mock bank</p>

          <form onSubmit={handleApplyChaos}>
            {/* Timeout Rate */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label className="form-label">Timeout Rate (Read Timeout)</label>
                <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-600)' }}>
                  {Math.round(chaos.timeoutRate * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={chaos.timeoutRate}
                onChange={(e) => setChaos({ ...chaos, timeoutRate: parseFloat(e.target.value) })}
                style={{ width: '100%', accentColor: 'var(--accent-600)' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Simulates 2,000ms socket timeout (triggers UNKNOWN outcome)
              </span>
            </div>

            {/* Error Rate */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label className="form-label">Server Error Rate (500)</label>
                <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#ef4444' }}>
                  {Math.round(chaos.errorRate * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={chaos.errorRate}
                onChange={(e) => setChaos({ ...chaos, errorRate: parseFloat(e.target.value) })}
                style={{ width: '100%', accentColor: '#ef4444' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Simulates internal banking server crash
              </span>
            </div>

            {/* Channel Failure Rate */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label className="form-label">Channel Drop Rate (503)</label>
                <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#f59e0b' }}>
                  {Math.round(chaos.channelFailureRate * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={chaos.channelFailureRate}
                onChange={(e) => setChaos({ ...chaos, channelFailureRate: parseFloat(e.target.value) })}
                style={{ width: '100%', accentColor: '#f59e0b' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Simulates payment rail gateway disconnection
              </span>
            </div>

            {/* Charge On Timeout Probability */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label className="form-label">Charge On Timeout Probability</label>
                <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--primary-800)' }}>
                  {Math.round(chaos.chargeOnTimeoutProbability * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={chaos.chargeOnTimeoutProbability}
                onChange={(e) => setChaos({ ...chaos, chargeOnTimeoutProbability: parseFloat(e.target.value) })}
                style={{ width: '100%' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Probability that bank debits funds before timing out
              </span>
            </div>

            {/* Injected Latency */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label className="form-label">Added Latency (ms)</label>
                <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {chaos.latencyMs} ms
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="3000"
                step="100"
                value={chaos.latencyMs}
                onChange={(e) => setChaos({ ...chaos, latencyMs: parseInt(e.target.value, 10) })}
                style={{ width: '100%' }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-secondary"
              disabled={chaosApplying}
              style={{ width: '100%', marginTop: '10px' }}
            >
              {chaosApplying ? 'Applying...' : 'Apply Chaos Settings'}
            </button>

            {chaosSuccessMsg && (
              <div style={{ marginTop: '12px', fontSize: '0.85rem', color: '#065f46', background: '#ecfdf5', padding: '8px 12px', borderRadius: '6px', textAlign: 'center' }}>
                {chaosSuccessMsg}
              </div>
            )}
          </form>
        </div>

        {/* Experiment Execution Card */}
        <div className="card">
          <h2 className="card-title">Run Comparative Benchmark</h2>
          <p className="card-subtitle">Executes NAIVE protocol then PROTECTED protocol under identical load</p>

          {/* Presets */}
          <div style={{ marginBottom: '20px', padding: '14px', background: 'var(--bg-card-subtle)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Select Experiment Preset
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn btn-sm ${expConfig.count === 60 ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => applyPreset('quick')}
              >
                ⚡ Quick demo (60 orders)
              </button>
              <button
                type="button"
                className={`btn btn-sm ${expConfig.count === 200 ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => applyPreset('full')}
              >
                🔬 Full Benchmark (200 orders)
              </button>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Order Count (Max 300)</label>
              <input
                type="number"
                min="10"
                max="300"
                className="form-input"
                value={expConfig.count}
                onChange={(e) => setExpConfig({ ...expConfig, count: e.target.value })}
                disabled={expStatus === 'RUNNING'}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Concurrency (Threads)</label>
              <input
                type="number"
                min="1"
                max="20"
                className="form-input"
                value={expConfig.concurrency}
                onChange={(e) => setExpConfig({ ...expConfig, concurrency: e.target.value })}
                disabled={expStatus === 'RUNNING'}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Duplicate Submit Rate</label>
              <select
                className="form-select"
                value={expConfig.duplicateSubmitRate}
                onChange={(e) => setExpConfig({ ...expConfig, duplicateSubmitRate: parseFloat(e.target.value) })}
                disabled={expStatus === 'RUNNING'}
              >
                <option value="0.0">0% (Single submissions only)</option>
                <option value="0.1">10% double submissions</option>
                <option value="0.2">20% double submissions (Standard)</option>
                <option value="0.4">40% double submissions (High race)</option>
              </select>
            </div>
          </div>

          {expError && (
            <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecdd3', borderRadius: '8px', color: '#991b1b', fontSize: '0.85rem' }}>
              <strong>Error:</strong> {expError}
            </div>
          )}

          {/* Running State Banner */}
          {expStatus === 'RUNNING' && (
            <div style={{ margin: '20px 0', padding: '20px', background: 'var(--primary-900)', borderRadius: '12px', color: '#fff', textAlign: 'center' }}>
              <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'var(--accent-400)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '12px' }}>
                Benchmark Running...
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--accent-100)', marginTop: '4px' }}>
                Executing NAIVE mode baseline, then PROTECTED protocol with real-time bank reconciliation.
              </p>
              <div style={{ marginTop: '12px', fontFamily: 'var(--font-mono)', fontSize: '1.3rem', color: 'var(--accent-400)', fontWeight: 700 }}>
                Elapsed: {(expDurationMs / 1000).toFixed(1)}s
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                Experiment ID: {activeExpId}
              </span>
            </div>
          )}

          {/* Completed State Banner */}
          {expStatus === 'DONE' && (
            <div style={{ margin: '20px 0', padding: '20px', background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🎉</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#065f46' }}>
                Benchmark Completed Successfully!
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#047857', marginTop: '4px', marginBottom: '16px' }}>
                Total duration: {(expDurationMs / 1000).toFixed(1)}s. Both NAIVE and PROTECTED runs have settled.
              </p>
              <button
                className="btn btn-accent btn-lg"
                onClick={() => navigate(`/compare/${activeExpId}`)}
              >
                📊 View Head-to-Head Comparison →
              </button>
            </div>
          )}

          <div style={{ marginTop: '24px' }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleRunExperiment}
              disabled={startingExp || expStatus === 'RUNNING'}
              style={{ width: '100%' }}
            >
              {expStatus === 'RUNNING' ? 'Running Experiment...' : '🚀 Start Experiment Run'}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Admin Reset */}
      {showResetModal && (
        <div className="modal-backdrop" onClick={() => setShowResetModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#991b1b', marginBottom: '12px' }}>
              Confirm System Reset
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--primary-700)', lineHeight: 1.6, marginBottom: '20px' }}>
              Are you sure you want to reset all data? This will truncate all payment records, audit events, attempt counters, idempotency keys, and reset the mock bank charge database.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowResetModal(false)}
                disabled={resetting}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={handleConfirmReset}
                disabled={resetting}
              >
                {resetting ? 'Resetting...' : 'Yes, Reset Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
