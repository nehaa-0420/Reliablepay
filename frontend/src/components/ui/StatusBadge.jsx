import React from 'react';

export default function StatusBadge({
  status,
  size = 'md', // 'sm' | 'md'
  showDot = true,
  className = ''
}) {
  const normStatus = (status || 'INITIATED').toUpperCase();

  // Status mapping
  const config = {
    SUCCESS: {
      label: 'Success',
      className: 'badge-success',
      pulse: false
    },
    RETRYING: {
      label: 'Retrying',
      className: 'badge-retrying',
      pulse: true
    },
    PROCESSING: {
      label: 'Processing',
      className: 'badge-processing',
      pulse: true
    },
    UNKNOWN: {
      label: 'Unknown',
      className: 'badge-unknown',
      pulse: false
    },
    FAILED: {
      label: 'Failed',
      className: 'badge-failed',
      pulse: false
    },
    DEAD_LETTERED: {
      label: 'Dead-Lettered',
      className: 'badge-failed',
      pulse: false
    },
    INITIATED: {
      label: 'Initiated',
      className: 'badge-initiated',
      pulse: false
    },
    // Payment Modes
    PROTECTED: {
      label: 'Protected',
      className: 'badge-protected',
      pulse: false
    },
    NAIVE: {
      label: 'Naive',
      className: 'badge-naive',
      pulse: false
    }
  };

  const item = config[normStatus] || {
    label: normStatus,
    className: 'badge-initiated',
    pulse: false
  };

  return (
    <span className={`status-badge ${item.className} badge-size-${size} ${className}`}>
      {showDot && (
        <span className="badge-dot-wrapper">
          <span className="badge-dot" />
          {item.pulse && <span className="badge-dot-pulse" />}
        </span>
      )}
      <span className="badge-label">{item.label}</span>
    </span>
  );
}
