import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = '540px',
  footer,
  showClose = true
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="ui-modal-portal">
          {/* Backdrop */}
          <motion.div
            className="ui-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />

          {/* Dialog Container */}
          <div className="ui-modal-container">
            <motion.div
              className="ui-modal-dialog"
              style={{ maxWidth }}
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              onClick={(e) => e.stopPropagation()}
            >
              {(title || showClose) && (
                <div className="ui-modal-header">
                  <div>
                    {title && <h3 className="ui-modal-title">{title}</h3>}
                    {subtitle && <p className="ui-modal-subtitle">{subtitle}</p>}
                  </div>
                  {showClose && (
                    <button
                      type="button"
                      className="ui-modal-close"
                      onClick={onClose}
                      aria-label="Close dialog"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              )}

              <div className="ui-modal-body">{children}</div>

              {footer && <div className="ui-modal-footer">{footer}</div>}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
