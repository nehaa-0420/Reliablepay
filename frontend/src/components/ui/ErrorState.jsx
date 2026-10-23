import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from './Button';

export default function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while loading this data.',
  onRetry,
  className = ''
}) {
  return (
    <div className={`ui-error-state ${className}`}>
      <div className="ui-error-state-icon">
        <AlertTriangle size={36} strokeWidth={1.8} />
      </div>
      <h3 className="ui-error-state-title">{title}</h3>
      {message && <p className="ui-error-state-message">{message}</p>}
      {onRetry && (
        <div className="ui-error-state-action">
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
