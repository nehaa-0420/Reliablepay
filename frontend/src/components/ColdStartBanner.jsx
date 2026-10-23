import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X, Loader2 } from 'lucide-react';

export default function ColdStartBanner({ visible, onDismiss }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ overflow: 'hidden' }}
        >
          <div
            style={{
              backgroundColor: 'var(--status-retrying-light)',
              borderBottom: '1px solid var(--status-retrying-border)',
              color: 'var(--status-retrying-dark)',
              padding: '10px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.85rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Loader2 size={16} className="spin text-warning" />
              <span>
                <strong>Waking up backend services:</strong> Free cloud tier containers take ~30–60s on cold start. Subsequent requests execute instantly.
              </span>
            </div>
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                style={{ color: 'var(--status-retrying-dark)', padding: '2px', display: 'flex', alignItems: 'center' }}
                aria-label="Dismiss banner"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
