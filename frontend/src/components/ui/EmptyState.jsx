import React from 'react';
import { Inbox } from 'lucide-react';
import Button from './Button';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No data found',
  description = 'There are no records matching your criteria.',
  actionLabel,
  onAction,
  actionIcon,
  className = ''
}) {
  return (
    <div className={`ui-empty-state ${className}`}>
      <div className="ui-empty-state-icon">
        <Icon size={40} strokeWidth={1.5} />
      </div>
      <h3 className="ui-empty-state-title">{title}</h3>
      {description && <p className="ui-empty-state-description">{description}</p>}
      {actionLabel && onAction && (
        <div className="ui-empty-state-action">
          <Button variant="secondary" size="sm" icon={actionIcon} onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
