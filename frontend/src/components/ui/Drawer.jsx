import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = '520px',
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
        <div className="ui-drawer-portal">
          {/* Backdrop */}
          <motion.div
            className="ui-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Drawer Panel */}
          <motion.div
            className="ui-drawer-panel"
            style={{ width, maxWidth: '100vw' }}
            role="dialog"
            aria-modal="true"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ui-drawer-header">
              <div className="ui-drawer-title-area">
                {title && <h3 className="ui-drawer-title">{title}</h3>}
                {subtitle && <div className="ui-drawer-subtitle">{subtitle}</div>}
              </div>
              {showClose && (
                <button
                  type="button"
                  className="ui-drawer-close"
                  onClick={onClose}
                  aria-label="Close drawer"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            <div className="ui-drawer-body">{children}</div>

            {footer && <div className="ui-drawer-footer">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
