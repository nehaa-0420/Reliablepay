import React from 'react';

export default function StatusBadge({ status, className = '' }) {
  if (!status) return null;
  return (
    <span className={`badge badge-${status} ${className}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
