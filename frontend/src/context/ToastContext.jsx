import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ title, message, type = 'info', duration = 4000 }) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((message, title = 'Success') => {
    return addToast({ title, message, type: 'success' });
  }, [addToast]);

  const error = useCallback((message, title = 'Error') => {
    return addToast({ title, message, type: 'error', duration: 6000 });
  }, [addToast]);

  const info = useCallback((message, title = 'Notice') => {
    return addToast({ title, message, type: 'info' });
  }, [addToast]);

  const warning = useCallback((message, title = 'Warning') => {
    return addToast({ title, message, type: 'warning' });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error, info, warning }}>
      {children}
      <div className="toast-container" role="region" aria-label="Notifications">
        <AnimatePresence>
          {toasts.map((toast) => {
            const icons = {
              success: <CheckCircle2 className="toast-icon text-success" size={20} />,
              error: <AlertCircle className="toast-icon text-danger" size={20} />,
              warning: <AlertTriangle className="toast-icon text-warning" size={20} />,
              info: <Info className="toast-icon text-info" size={20} />
            };

            return (
              <motion.div
                key={toast.id}
                className={`toast-item toast-${toast.type}`}
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                layout
              >
                <div className="toast-content">
                  {icons[toast.type] || icons.info}
                  <div className="toast-text">
                    {toast.title && <div className="toast-title">{toast.title}</div>}
                    <div className="toast-message">{toast.message}</div>
                  </div>
                </div>
                <button
                  className="toast-close"
                  onClick={() => removeToast(toast.id)}
                  aria-label="Close notification"
                >
                  <X size={15} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export default ToastContext;
