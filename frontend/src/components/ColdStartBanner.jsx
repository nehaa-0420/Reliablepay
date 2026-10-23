import React from 'react';

export default function ColdStartBanner({ visible, onDismiss }) {
  if (!visible) return null;

  return (
    <div className="cold-start-banner">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>⏳</span>
        <span>
          <strong>Waking up the backend:</strong> Free cloud hosting can take about a minute on a cold start. Subsequent requests will be fast!
        </span>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} aria-label="Dismiss banner">
          ✕
        </button>
      )}
    </div>
  );
}
