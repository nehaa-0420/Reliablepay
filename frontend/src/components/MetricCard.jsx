import React from 'react';

export default function MetricCard({ title, value, subtext, highlight = null }) {
  let valClass = 'metric-card-value';
  if (highlight === 'danger') valClass += ' metric-highlight-danger';
  if (highlight === 'success') valClass += ' metric-highlight-success';

  return (
    <div className="metric-card">
      <div>
        <div className="metric-card-header">{title}</div>
        <div className={valClass}>{value}</div>
      </div>
      {subtext && <div className="metric-card-sub">{subtext}</div>}
    </div>
  );
}
