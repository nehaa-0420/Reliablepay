import React from 'react';
import { motion } from 'framer-motion';

export default function Tabs({
  tabs = [],
  activeTab,
  onChange,
  className = '',
  variant = 'pill' // 'pill' | 'underline'
}) {
  return (
    <div className={`ui-tabs ui-tabs-${variant} ${className}`} role="tablist">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`ui-tab-item ${isActive ? 'is-active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.icon && <span className="ui-tab-icon">{tab.icon}</span>}
            <span className="ui-tab-label">{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`ui-tab-count ${isActive ? 'ui-tab-count-active' : ''}`}>
                {tab.count}
              </span>
            )}

            {isActive && (
              <motion.div
                className={variant === 'pill' ? 'ui-tab-active-pill' : 'ui-tab-active-underline'}
                layoutId={`active-tab-${variant}`}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
