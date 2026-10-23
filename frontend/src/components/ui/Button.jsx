import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function Button({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent'
  size = 'md', // 'sm' | 'md' | 'lg'
  loading = false,
  disabled = false,
  icon: Icon,
  iconRight: IconRight,
  className = '',
  type = 'button',
  onClick,
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      type={type}
      className={`btn btn-${variant} btn-${size} ${className}`}
      disabled={isDisabled}
      onClick={isDisabled ? undefined : onClick}
      whileTap={{ scale: isDisabled ? 1 : 0.98 }}
      transition={{ duration: 0.1 }}
      {...props}
    >
      {loading ? (
        <Loader2 className="btn-spinner" size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
      ) : Icon ? (
        <Icon className="btn-icon-left" size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
      ) : null}
      
      <span className="btn-text">{children}</span>
      
      {!loading && IconRight && (
        <IconRight className="btn-icon-right" size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
      )}
    </motion.button>
  );
}
