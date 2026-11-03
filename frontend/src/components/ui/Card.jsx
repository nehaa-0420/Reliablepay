import React from 'react';
import { motion } from 'framer-motion';

export default function Card({
  children,
  className = '',
  hoverLift = false,
  elevated = false,
  subtle = false,
  onClick,
  style,
  ...props
}) {
  const classes = [
    'ui-card',
    elevated ? 'ui-card-elevated' : '',
    subtle ? 'ui-card-subtle' : '',
    hoverLift ? 'ui-card-hover' : '',
    onClick ? 'cursor-pointer' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      onClick={onClick}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, badge, action, className = '', children }) {
  return (
    <div className={`ui-card-header ${className}`}>
      <div className="ui-card-header-main">
        {title && <h3 className="ui-card-title">{title}</h3>}
        {subtitle && <p className="ui-card-subtitle">{subtitle}</p>}
        {children}
      </div>
      <div className="ui-card-header-actions">
        {badge}
        {action}
      </div>
    </div>
  );
}

export function CardBody({ children, className = '', noPadding = false }) {
  return (
    <div className={`ui-card-body ${noPadding ? 'p-0' : ''} ${className}`}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={`ui-card-footer ${className}`}>
      {children}
    </div>
  );
}
