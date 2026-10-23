import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  Zap,
  Sliders,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldAlert,
  Server,
  Layers,
  Sparkles,
  Loader2
} from 'lucide-react';
import api from '../api/client';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Slider from '../components/ui/Slider';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import ProgressSteps from '../components/ui/ProgressSteps';
import { useToast } from '../context/ToastContext';

export default function ChaosLabPage() {
  const navigate = useNavigate();
  const toast = useToast();

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

  // Experiment state
  const [expConfig, setExpConfig] = useState({
    count: 60,
    concurrency: 10,
    duplicateSubmitRate: 0.2
  });
  const [activeExpId, setActiveExpId] = useState(null);
  const [expStatus, setExpStatus] = useState(null); // 'RUNNING' | 'DONE' | 'FAILED'
  const [expPhase, setExpPhase] = useState(0); // 0: Naive, 1: Protected, 2: Done
  const [expDurationMs, setExpDurationMs] = useState(0);
  const [startingExp, setStartingExp] = useState(false);
  const [expError, setExpError] = useState(null);

  // Timer for active experiment
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef(null);

  // Reset modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState('');
  const [resetting, setResetting] = useState(false);

  // Presets
  const presets = [
    {
      name: 'Calm',
      desc: 'Normal network conditions',
      config: { timeoutRate: 0.0, errorRate: 0.0, channelFailureRate: 0.0, chargeOnTimeoutProbability: 0.5, latencyMs: 0 }
    },
    {
      name: 'Flaky',
      desc: '10% gateway HTTP 500 errors',
      config: { timeoutRate: 0.0, errorRate: 0.1, channelFailureRate: 0.0, chargeOnTimeoutProbability: 0.5, latencyMs: 0 }
    },
    {
      name: 'Timeout storm',
      desc: '40% socket timeouts during transmission',
      config: { timeoutRate: 0.4, errorRate: 0.0, channelFailureRate: 0.0, chargeOnTimeoutProbability: 0.5, latencyMs: 2500 }
    },
    {
      name: 'Demo (Recommended)',
      desc: '30% timeouts + 10% errors + 500ms latency',
      config: { timeoutRate: 0.3, errorRate: 0.1, channelFailureRate: 0.0, chargeOnTimeoutProbability: 0.5, latencyMs: 500 }
    }
  ];

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

    // Start timer counter
    setElapsedSeconds(0);
    timerRef.current = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await api.getExperiment(activeExpId);
        if (!isMounted) return;

        setExpStatus(res.status);
        if (res.durationMs !== undefined && res.durationMs !== null) {
          setExpDurationMs(res.durationMs);
        }

        // Infer phase from presence of results
        if (res.status === 'DONE') {
          setExpPhase(2);
          clearInterval(interval);
          if (timerRef.current) clearInterval(timerRef.current);
          try {
            localStorage.setItem('latest_experiment_id', activeExpId);
          } catch (e) {
            // ignore
          }
          toast.success('Benchmark run complete! Results ready to inspect.');
        } else if (res.status === 'FAILED') {
          setExpPhase(0);
          clearInterval(interval);
          if (timerRef.current) clearInterval(timerRef.current);
          setExpError(res.errorMessage || 'Experiment execution encountered an unexpected error');
          toast.error(res.errorMessage || 'Experiment execution failed');
        } else if (res.naive && (!res.protectedMode || Object.keys(res.protectedMode).length === 0)) {
          setExpPhase(1); // Protected run in progress
        } else {
          setExpPhase(0); // Naive run in progress
        }
      } catch (err) {
        console.error('Error polling experiment', err);
      }
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeExpId]);

  // Apply Chaos config
  const handleApplyChaos = async (e) => {
    e.preventDefault();
    setChaosApplying(true);
    try {
      await api.updateChaosConfig(chaos);
      toast.success('Chaos parameters successfully applied to Mock Bank gateway!');
    } catch (err) {
      toast.error(err.message || 'Failed to update chaos settings');
    } finally {
      setChaosApplying(false);
    }
  };

  const handleApplyPreset = (preset) => {
    setChaos(preset.config);
    api.updateChaosConfig(preset.config)
      .then(() => toast.success(`Applied "${preset.name}" profile to bank gateway!`))
      .catch((err) => toast.error(err.message || 'Failed to apply preset'));
  };

  // Run Experiment
  const handleRunExperiment = async (overrideCount) => {
    // Ensure Demo chaos preset values (timeoutRate 0.3, errorRate 0.1) if not explicitly set
    const chaosPayload = {
      timeoutRate: chaos.timeoutRate > 0 ? chaos.timeoutRate : 0.3,
      errorRate: chaos.errorRate > 0 ? chaos.errorRate : 0.1,
      channelFailureRate: chaos.channelFailureRate ?? 0.0,
      chargeOnTimeoutProbability: chaos.chargeOnTimeoutProbability ?? 0.5,
      latencyMs: chaos.latencyMs ?? 500
    };

    const runConfig = {
      ...expConfig,
      count: overrideCount || expConfig.count,
      chaos: chaosPayload
    };

    setStartingExp(true);
    setExpError(null);
    setExpStatus('RUNNING');
    setExpPhase(0);

    try {
      const res = await api.runExperiment(runConfig);
      setActiveExpId(res.id);
      toast.info(`Benchmark experiment #${res.id.substring(0, 8)} started!`);
    } catch (err) {
      if (err.status === 409) {
        setExpError('Another experiment is already running. Please wait for it to complete.');
        toast.warning('Experiment in progress: System currently running another benchmark.');
      } else {
        setExpError(err.message || 'Failed to trigger experiment');
        toast.error(err.message || 'Failed to start experiment');
      }
      setExpStatus(null);
    } finally {
      setStartingExp(false);
    }
  };

  // Prepare Demo: Reset data -> Apply Demo chaos (timeout 0.3, error 0.1) -> Run Quick 60
  const handlePrepareDemo = async () => {
    setStartingExp(true);
    setExpError(null);
    try {
      toast.info('Step 1/3: Purging old demo records...');
      await api.resetSystem();

      toast.info('Step 2/3: Applying Demo chaos preset (30% timeouts, 10% errors)...');
      const demoChaos = {
        timeoutRate: 0.3,
        errorRate: 0.1,
        channelFailureRate: 0.0,
        chargeOnTimeoutProbability: 0.5,
        latencyMs: 500
      };
      setChaos(demoChaos);
      await api.updateChaosConfig(demoChaos);

      toast.info('Step 3/3: Launching Quick 60 benchmark trial...');
      setExpStatus('RUNNING');
      setExpPhase(0);
      const res = await api.runExperiment({
        count: 60,
        concurrency: 10,
        duplicateSubmitRate: 0.2,
        chaos: demoChaos
      });
      setActiveExpId(res.id);
      toast.success(`Demo benchmark #${res.id.substring(0, 8)} initialized!`);
    } catch (err) {
      toast.error(err.message || 'Prepare demo failed');
      setExpStatus(null);
    } finally {
      setStartingExp(false);
    }
  };

  // Handle Reset System Data
  const handleResetSystem = async () => {
    if (resetConfirmInput.trim() !== 'RESET') {
      toast.error('Please type RESET to confirm');
      return;
    }

    setResetting(true);
    try {
      await api.resetSystem();
      setShowResetModal(false);
      setResetConfirmInput('');
      toast.success('System reset complete: All payments and bank charges purged.');
    } catch (err) {
      toast.error(err.message || 'Reset failed');
    } finally {
      setResetting(false);
    }
  };

  const isRunning = expStatus === 'RUNNING';

  const experimentSteps = [
    {
      title: 'Phase 1: NAIVE Baseline Run',
      description: 'Dispatches payments without Idempotency-Keys or atomic guards to measure raw double-charges.',
      loading: isRunning && expPhase === 0
    },
    {
      title: 'Phase 2: PROTECTED Engine Run',
      description: 'Dispatches identical workload through the transactional state machine and retry reconciler.',
      loading: isRunning && expPhase === 1
    },
    {
      title: 'Phase 3: Analysis & Delta Computation',
      description: 'Ledgers compared, prevented double debits calculated, and audit verification finalized.',
      loading: isRunning && expPhase === 2
    }
  ];

  return (
    <div className="chaos-lab-view" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '9999px', background: 'var(--status-retrying-light)', color: 'var(--status-retrying-dark)', fontSize: '0.78rem', fontWeight: 700, marginBottom: '8px' }}>
            <Flame size={14} />
            <span>Chaos Engineering & Fault Injection</span>
          </div>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
            Mock Bank Chaos Lab
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginTop: '4px' }}>
            Inject latency, socket timeouts, and HTTP errors into upstream gateway to benchmark reliability.
          </p>
        </div>
      </div>

      {/* Preset Chips */}
      <div>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Network Chaos Profiles
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {presets.map((preset) => (
            <button
              key={preset.name}
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={isRunning}
              onClick={() => handleApplyPreset(preset)}
              style={{ padding: '8px 14px', borderRadius: '10px' }}
            >
              <Zap size={14} className="text-accent" />
              <span>{preset.name}</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
                ({preset.desc})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Chaos Parameter Sliders & Benchmark Runner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 440px) 1fr', gap: '28px', alignItems: 'start' }}>
        {/* Chaos Sliders Form */}
        <Card elevated>
          <CardHeader
            title="Gateway Fault Parameters"
            subtitle="Configure upstream simulated bank behavior"
            action={<Sliders size={18} className="text-muted" />}
          />
          <CardBody>
            <form onSubmit={handleApplyChaos} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <Slider
                label="Timeout Probability"
                value={chaos.timeoutRate}
                min={0}
                max={0.8}
                step={0.05}
                formatValue={(v) => `${Math.round(v * 100)}%`}
                description="Chance that bank hangs for 2.5s and drops TCP connection."
                disabled={isRunning}
                onChange={(v) => setChaos({ ...chaos, timeoutRate: v })}
              />

              <Slider
                label="HTTP 500 Error Rate"
                value={chaos.errorRate}
                min={0}
                max={0.5}
                step={0.05}
                formatValue={(v) => `${Math.round(v * 100)}%`}
                description="Immediate Internal Server Error responses from bank."
                disabled={isRunning}
                onChange={(v) => setChaos({ ...chaos, errorRate: v })}
              />

              <Slider
                label="Simulated Network Latency"
                value={chaos.latencyMs}
                min={0}
                max={2500}
                step={100}
                formatValue={(v) => `${v} ms`}
                description="Artificial sleep injected into all bank gateway operations."
                disabled={isRunning}
                onChange={(v) => setChaos({ ...chaos, latencyMs: v })}
              />

              <Slider
                label="Charge on Timeout Probability"
                value={chaos.chargeOnTimeoutProbability}
                min={0}
                max={1.0}
                step={0.1}
                formatValue={(v) => `${Math.round(v * 100)}%`}
                description="Real-world ambiguity: Did the bank debit money before the connection dropped?"
                disabled={isRunning}
                onChange={(v) => setChaos({ ...chaos, chargeOnTimeoutProbability: v })}
              />

              <Button
                type="submit"
                variant="primary"
                loading={chaosApplying}
                disabled={isRunning}
                style={{ width: '100%', marginTop: '6px' }}
              >
                Apply Parameters to Mock Bank
              </Button>
            </form>
          </CardBody>
        </Card>

        {/* Experiment Execution Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <Card elevated>
            <CardHeader
              title="Automated Protocol Benchmark"
              subtitle="Run comparative trial: NAIVE vs. PROTECTED"
              action={<Layers size={18} className="text-accent" />}
            />
            <CardBody>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '24px' }}>
                Executes two identical workloads under current chaos settings. The system dispatches batch transactions with concurrent duplicate client retries to calculate exact double-debits, overcharge losses, and recovery MTTR.
              </p>

              {/* Presets Row */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
                <Button
                  variant="primary"
                  size="md"
                  disabled={isRunning || startingExp}
                  onClick={handlePrepareDemo}
                  icon={Sparkles}
                >
                  Prepare Demo (Reset + 60 Txns)
                </Button>

                <Button
                  variant="accent"
                  size="md"
                  disabled={isRunning || startingExp}
                  onClick={() => handleRunExperiment(60)}
                  icon={Play}
                >
                  Run Quick Demo (60 Txns)
                </Button>

                <Button
                  variant="secondary"
                  size="md"
                  disabled={isRunning || startingExp}
                  onClick={() => handleRunExperiment(200)}
                >
                  Full Load (200 Txns)
                </Button>
              </div>

              {/* Active Experiment Progress Stepper */}
              {isRunning && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ background: 'var(--bg-surface-subtle)', border: '1px solid var(--border-subtle)', borderRadius: '14px', padding: '24px', marginBottom: '24px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Loader2 size={18} className="spin text-accent" />
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        Benchmark Run In Progress...
                      </span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Elapsed: {elapsedSeconds}s
                    </span>
                  </div>

                  <ProgressSteps
                    steps={experimentSteps}
                    currentStepIndex={expPhase}
                    orientation="vertical"
                  />
                </motion.div>
              )}

              {/* Completion Banner */}
              {expStatus === 'DONE' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{ background: 'var(--status-success-light)', border: '1px solid var(--status-success-border)', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <CheckCircle2 size={24} className="text-success" />
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--status-success-dark)', fontSize: '0.96rem' }}>
                        Benchmark Execution Completed
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--status-success-dark)', marginTop: '2px' }}>
                        Both NAIVE and PROTECTED protocols evaluated. Duration: {Math.round(expDurationMs / 1000)}s.
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="md"
                    iconRight={ArrowRight}
                    onClick={() => navigate(`/compare/${activeExpId}`)}
                  >
                    View Protocol Comparison
                  </Button>
                </motion.div>
              )}

              {expError && (
                <div style={{ padding: '14px', borderRadius: '10px', background: 'var(--status-failed-light)', border: '1px solid var(--status-failed-border)', color: 'var(--status-failed-dark)', fontSize: '0.88rem', marginTop: '16px' }}>
                  <strong>Notice:</strong> {expError}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Danger Zone Card */}
          <Card style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
            <CardHeader
              title="Danger Zone: Environment Reset"
              subtitle="Purge all payments, idempotency records, and bank ledger charges"
              action={<ShieldAlert size={18} className="text-danger" />}
            />
            <CardBody>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', lineHeight: 1.5, marginBottom: '16px' }}>
                Cleans all transaction history from the database to establish a fresh baseline before starting a live presentation or evaluation run.
              </p>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowResetModal(true)}
              >
                Reset System Database
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Confirm System Reset"
        subtitle="This action is irreversible and purges all recorded transactions."
        footer={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="secondary" size="sm" onClick={() => setShowResetModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={resetting}
              disabled={resetConfirmInput.trim() !== 'RESET'}
              onClick={handleResetSystem}
            >
              Purge Database
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Type <strong className="font-mono text-danger">RESET</strong> in the field below to confirm you want to wipe all payments and reset the mock bank ledger:
          </p>
          <Input
            value={resetConfirmInput}
            onChange={(e) => setResetConfirmInput(e.target.value)}
            placeholder="Type RESET"
            mono
          />
        </div>
      </Modal>
    </div>
  );
}
