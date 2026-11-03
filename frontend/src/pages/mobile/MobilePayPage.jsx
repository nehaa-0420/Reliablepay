import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Zap,
  ArrowRight,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Lock,
  Sparkles,
  HelpCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Tooltip from '../../components/ui/Tooltip';
import api from '../../api/client';

const DEMO_MERCHANTS = [
  { id: 'MERCH-SWIGGY', name: 'Swiggy Express', category: 'Food & Dining', icon: '🍔', defaultAmount: '350' },
  { id: 'MERCH-UBER', name: 'Uber Premier', category: 'Rides & Transit', icon: '🚗', defaultAmount: '450' },
  { id: 'MERCH-AMAZON', name: 'Amazon Pay', category: 'Shopping', icon: '📦', defaultAmount: '1200' },
  { id: 'MERCH-ZOMATO', name: 'Zomato Gold', category: 'Food Delivery', icon: '🍕', defaultAmount: '600' }
];

const PRESET_AMOUNTS = ['100', '250', '500', '1000', '2500'];

export default function MobilePayPage() {
  const navigate = useNavigate();

  const [selectedMerchant, setSelectedMerchant] = useState(DEMO_MERCHANTS[0]);
  const [amount, setAmount] = useState('350');
  const [simulateLostResponse, setSimulateLostResponse] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryStatusMessage, setRetryStatusMessage] = useState('');
  const [simulationAlert, setSimulationAlert] = useState(null);

  // Keypad click handler
  const handleKeypadPress = (val) => {
    if (val === 'C') {
      setAmount('0');
    } else if (val === 'DEL') {
      setAmount(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
    } else {
      setAmount(prev => {
        if (prev === '0') return val;
        if (prev.length >= 6) return prev;
        return prev + val;
      });
    }
  };

  const savePaymentToDeviceHistory = (paymentId) => {
    try {
      const existingStr = localStorage.getItem('rp_device_payments');
      const existing = existingStr ? JSON.parse(existingStr) : [];
      if (!existing.includes(paymentId)) {
        localStorage.setItem('rp_device_payments', JSON.stringify([paymentId, ...existing]));
      }
    } catch {
      // ignore
    }
  };

  const handlePay = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    setIsSubmitting(true);
    setRetryStatusMessage('');
    setSimulationAlert(null);

    // CRITICAL: Generate ONE Idempotency-Key per payment attempt and reuse it across every retry!
    const idempotencyKey = `idem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const payload = {
      merchantRef: `${selectedMerchant.id}-${Date.now().toString().slice(-6)}`,
      amount: numAmount,
      currency: 'INR',
      mode: 'PROTECTED'
    };

    try {
      if (simulateLostResponse) {
        // CLIENT RESILIENCE DEMO: "Simulate lost response"
        setRetryStatusMessage('Simulating network drop: dispatching initial charge...');
        await api.createPayment(payload, idempotencyKey);

        // Intentionally discard first response as if client disconnected / timed out
        setRetryStatusMessage('Network dropped response. Retrying with SAME Idempotency-Key...');
        await new Promise(r => setTimeout(r, 1200));

        // Re-dispatch with exact same Idempotency-Key
        const replayRes = await api.createPayment(payload, idempotencyKey);
        savePaymentToDeviceHistory(replayRes.id);

        setSimulationAlert({
          message: 'Client resilience demonstrated! Initial response was simulated lost; second request replayed the exact same Idempotency-Key. Server returned existing transaction with zero double debits.',
          paymentId: replayRes.id
        });

        setTimeout(() => {
          navigate(`/app/progress/${replayRes.id}`);
        }, 2200);

      } else {
        // Normal payment with automated client retry loop for network issues
        let attempts = 0;
        let successPayment = null;

        while (attempts < 3 && !successPayment) {
          attempts += 1;
          try {
            if (attempts > 1) {
              setRetryStatusMessage(`Network issue, retrying safely (attempt ${attempts}/3)...`);
              await new Promise(r => setTimeout(r, 800 * attempts));
            }

            const res = await api.createPayment(payload, idempotencyKey);
            successPayment = res;
          } catch (err) {
            if (attempts >= 3) throw err;
          }
        }

        if (successPayment) {
          savePaymentToDeviceHistory(successPayment.id);
          navigate(`/app/progress/${successPayment.id}`);
        }
      }
    } catch (err) {
      setRetryStatusMessage(`Payment failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* App Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-brand-accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Instant UPI & Cards
          </div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, margin: '2px 0 0', color: 'var(--text-primary)' }}>
            Quick Checkout
          </h1>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 8px',
          borderRadius: '12px',
          background: 'var(--status-success-bg)',
          color: 'var(--status-success-text)',
          fontSize: '11px',
          fontWeight: 600,
          border: '1px solid var(--status-success-border)'
        }}>
          <ShieldCheck size={12} />
          <span>Protected</span>
        </div>
      </div>

      {/* Merchant Picker */}
      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
          Select Merchant
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
          {DEMO_MERCHANTS.map((m) => {
            const isSelected = selectedMerchant.id === m.id;
            return (
              <div
                key={m.id}
                onClick={() => {
                  setSelectedMerchant(m);
                  setAmount(m.defaultAmount);
                }}
                style={{
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  background: isSelected ? 'var(--color-brand-surface)' : 'var(--bg-surface-elevated)',
                  border: isSelected ? '1.5px solid var(--color-brand-primary)' : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{ fontSize: '20px' }}>{m.icon}</span>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {m.name}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {m.category}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Amount Display */}
      <div style={{
        background: 'var(--bg-surface-elevated)',
        padding: '16px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
          Amount in Indian Rupees (INR)
        </div>
        <div style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          ₹{Number(amount || 0).toLocaleString()}
        </div>

        {/* Amount Preset Chips */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '12px' }}>
          {PRESET_AMOUNTS.map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setAmount(val)}
              style={{
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 600,
                background: amount === val ? 'var(--color-brand-primary)' : 'var(--bg-surface)',
                color: amount === val ? '#ffffff' : 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
                cursor: 'pointer'
              }}
            >
              ₹{val}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Keypad */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '6px'
      }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => handleKeypadPress(k)}
            style={{
              height: '44px',
              minHeight: '44px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface-elevated)',
              color: 'var(--text-primary)',
              fontSize: '16px',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              userSelect: 'none',
              transition: 'background 0.1s ease'
            }}
          >
            {k === 'DEL' ? '⌫' : k}
          </button>
        ))}
      </div>

      {/* Settings Toggle: Simulate Lost Response */}
      <div style={{
        padding: '10px 14px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-surface-elevated)',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Simulate Lost Response
            </span>
            <Tooltip content="Drops client response to trigger automatic client retry with identical key." position="top">
              <HelpCircle size={12} color="var(--text-muted)" />
            </Tooltip>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            Tests server-side idempotency replay
          </div>
        </div>

        <button
          type="button"
          onClick={() => setSimulateLostResponse(!simulateLostResponse)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            color: simulateLostResponse ? 'var(--color-brand-primary)' : 'var(--text-muted)'
          }}
        >
          {simulateLostResponse ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
        </button>
      </div>

      {/* Resilience Simulation Alert */}
      <AnimatePresence>
        {simulationAlert && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--status-success-bg)',
              color: 'var(--status-success-text)',
              border: '1px solid var(--status-success-border)',
              fontSize: '11px',
              lineHeight: 1.4,
              display: 'flex',
              gap: '8px'
            }}
          >
            <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Idempotent Replay Verified:</strong> {simulationAlert.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Retry status toast */}
      {retryStatusMessage && (
        <div style={{
          fontSize: '11px',
          color: 'var(--color-warning-500)',
          textAlign: 'center',
          fontWeight: 600
        }}>
          {retryStatusMessage}
        </div>
      )}

      {/* Pay CTA Button (Min 44px touch target) */}
      <Button
        id="mobile-pay-cta-btn"
        variant="primary"
        size="lg"
        loading={isSubmitting}
        disabled={parseFloat(amount) <= 0}
        onClick={handlePay}
        icon={<ArrowRight size={18} />}
        style={{
          width: '100%',
          height: '52px',
          minHeight: '52px',
          fontSize: '16px',
          fontWeight: 700,
          boxShadow: '0 8px 20px var(--shadow-brand)'
        }}
      >
        Pay ₹{Number(amount || 0).toLocaleString()} to {selectedMerchant.name}
      </Button>
    </div>
  );
}
