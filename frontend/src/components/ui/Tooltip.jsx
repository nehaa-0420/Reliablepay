import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Tooltip({
  content,
  children,
  position = 'top', // 'top' | 'bottom' | 'left' | 'right'
  delay = 200
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);

  const show = () => {
    const id = setTimeout(() => setIsVisible(true), delay);
    setTimeoutId(id);
  };

  const hide = () => {
    if (timeoutId) clearTimeout(timeoutId);
    setIsVisible(false);
  };

  const positions = {
    top: { initial: { opacity: 0, y: 4, scale: 0.95 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 4, scale: 0.95 }, className: 'tooltip-top' },
    bottom: { initial: { opacity: 0, y: -4, scale: 0.95 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: -4, scale: 0.95 }, className: 'tooltip-bottom' },
    left: { initial: { opacity: 0, x: 4, scale: 0.95 }, animate: { opacity: 1, x: 0, scale: 1 }, exit: { opacity: 0, x: 4, scale: 0.95 }, className: 'tooltip-left' },
    right: { initial: { opacity: 0, x: -4, scale: 0.95 }, animate: { opacity: 1, x: 0, scale: 1 }, exit: { opacity: 0, x: -4, scale: 0.95 }, className: 'tooltip-right' }
  };

  const posConfig = positions[position] || positions.top;

  return (
    <div className="tooltip-wrapper" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      <AnimatePresence>
        {isVisible && content && (
          <motion.div
            className={`tooltip-bubble ${posConfig.className}`}
            role="tooltip"
            initial={posConfig.initial}
            animate={posConfig.animate}
            exit={posConfig.exit}
            transition={{ duration: 0.12 }}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
