import React, { useEffect, useState, useRef } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

function CountUpNumber({ value, prefix = '', suffix = '', decimals = 0 }) {
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]+/g, '')) || 0;
  
  const spring = useSpring(0, { mass: 0.8, stiffness: 80, damping: 15 });
  const display = useTransform(spring, (latest) => {
    if (isNaN(latest)) return `${prefix}${value}${suffix}`;
    const formatted = decimals > 0 ? latest.toFixed(decimals) : Math.round(latest).toLocaleString();
    return `${prefix}${formatted}${suffix}`;
  });

  const [currentDisplay, setCurrentDisplay] = useState(`${prefix}${value}${suffix}`);

  useEffect(() => {
    spring.set(numericValue);
  }, [numericValue, spring]);

  useEffect(() => {
    return display.on('change', (latest) => setCurrentDisplay(latest));
  }, [display]);

  return <span className="stat-number">{currentDisplay}</span>;
}

export default function Stat({
  title,
  value,
  subtext,
  icon: Icon,
  highlight, // 'success' | 'danger' | 'warning' | 'info'
  prefix = '',
  suffix = '',
  decimals = 0,
  sparklineData = [], // array of numbers for mini sparkline
  className = ''
}) {
  const isNumeric = typeof value === 'number' || (!isNaN(parseFloat(value)) && isFinite(value));

  // Render tiny SVG sparkline
  const renderSparkline = () => {
    if (!sparklineData || sparklineData.length < 2) return null;
    const min = Math.min(...sparklineData);
    const max = Math.max(...sparklineData);
    const range = max - min || 1;
    const width = 64;
    const height = 24;
    const points = sparklineData
      .map((val, idx) => {
        const x = (idx / (sparklineData.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 4) - 2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    const strokeColor =
      highlight === 'danger'
        ? 'var(--status-failed)'
        : highlight === 'success'
        ? 'var(--status-success)'
        : 'var(--color-primary-500)';

    return (
      <svg className="stat-sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  const highlightClass = highlight ? `stat-highlight-${highlight}` : '';

  return (
    <div className={`stat-card ${highlightClass} ${className}`}>
      <div className="stat-header">
        <span className="stat-title">{title}</span>
        {Icon && (
          <span className="stat-icon-wrapper">
            <Icon size={18} />
          </span>
        )}
      </div>

      <div className="stat-value-row">
        <div className="stat-value">
          {isNumeric ? (
            <CountUpNumber value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
          ) : (
            <span className="stat-number">{value}</span>
          )}
        </div>
        {renderSparkline()}
      </div>

      {subtext && <div className="stat-subtext">{subtext}</div>}
    </div>
  );
}
