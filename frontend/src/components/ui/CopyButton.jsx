import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check } from 'lucide-react';

export default function CopyButton({
  text,
  size = 'sm', // 'sm' | 'md'
  label,
  className = '',
  onCopied
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      if (onCopied) onCopied();
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Failed to copy to clipboard', err);
    }
  };

  return (
    <button
      type="button"
      className={`ui-copy-btn ui-copy-btn-${size} ${copied ? 'is-copied' : ''} ${className}`}
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
      aria-label="Copy to clipboard"
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="check"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="ui-copy-icon text-success"
          >
            <Check size={size === 'sm' ? 13 : 15} />
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="ui-copy-icon"
          >
            <Copy size={size === 'sm' ? 13 : 15} />
          </motion.span>
        )}
      </AnimatePresence>
      {label && <span className="ui-copy-label">{copied ? 'Copied' : label}</span>}
    </button>
  );
}
