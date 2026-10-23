import React from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2, AlertCircle } from 'lucide-react';

export default function ProgressSteps({
  steps = [],
  currentStepIndex = 0,
  orientation = 'horizontal', // 'horizontal' | 'vertical'
  className = ''
}) {
  return (
    <div className={`ui-stepper ui-stepper-${orientation} ${className}`}>
      {steps.map((step, idx) => {
        const isCompleted = idx < currentStepIndex;
        const isCurrent = idx === currentStepIndex;
        const isUpcoming = idx > currentStepIndex;
        const isFailed = step.failed;

        let statusClass = 'step-upcoming';
        if (isFailed) statusClass = 'step-failed';
        else if (isCompleted) statusClass = 'step-completed';
        else if (isCurrent) statusClass = 'step-current';

        return (
          <div key={step.id || idx} className={`ui-step-item ${statusClass}`}>
            <div className="ui-step-node">
              <motion.div
                className="ui-step-icon"
                initial={false}
                animate={{
                  scale: isCurrent ? 1.08 : 1
                }}
                transition={{ duration: 0.2 }}
              >
                {isFailed ? (
                  <AlertCircle size={14} className="text-danger" />
                ) : isCompleted ? (
                  <Check size={14} className="text-white" />
                ) : isCurrent && step.loading ? (
                  <Loader2 size={14} className="spin text-accent" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </motion.div>

              {idx < steps.length - 1 && (
                <div className="ui-step-connector">
                  <div
                    className={`ui-step-connector-fill ${isCompleted ? 'is-filled' : ''}`}
                  />
                </div>
              )}
            </div>

            <div className="ui-step-content">
              <div className="ui-step-title">{step.title}</div>
              {step.description && (
                <div className="ui-step-description">{step.description}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
