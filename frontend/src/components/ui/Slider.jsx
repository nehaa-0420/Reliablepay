import React from 'react';

export default function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.05,
  formatValue = (v) => `${Math.round(v * 100)}%`,
  description,
  disabled = false,
  className = '',
  id
}) {
  const sliderId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  // Calculate percentage for background gradient track
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  return (
    <div className={`ui-slider-card ${disabled ? 'opacity-60' : ''} ${className}`}>
      <div className="ui-slider-header">
        <label htmlFor={sliderId} className="ui-slider-label">
          {label}
        </label>
        <span className="ui-slider-badge">
          {formatValue(value)}
        </span>
      </div>

      <div className="ui-slider-control">
        <input
          id={sliderId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="ui-slider-input"
          style={{
            background: `linear-gradient(to right, var(--color-accent-600) 0%, var(--color-accent-600) ${percentage}%, var(--border-default) ${percentage}%, var(--border-default) 100%)`
          }}
        />
      </div>

      {description && <p className="ui-slider-description">{description}</p>}
    </div>
  );
}
