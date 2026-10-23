import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

const Select = forwardRef(function Select(
  {
    label,
    options = [],
    error,
    helperText,
    id,
    disabled = false,
    className = '',
    children,
    ...props
  },
  ref
) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`ui-input-wrapper ${disabled ? 'opacity-60' : ''} ${className}`}>
      {label && (
        <label htmlFor={selectId} className="ui-input-label">
          {label}
        </label>
      )}

      <div className={`ui-select-control ${error ? 'ui-input-error' : ''}`}>
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          className="ui-select-element"
          {...props}
        >
          {children ||
            options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label || opt.value}
              </option>
            ))}
        </select>
        <span className="ui-select-chevron">
          <ChevronDown size={16} />
        </span>
      </div>

      {error ? (
        <p className="ui-input-message text-danger">{error}</p>
      ) : helperText ? (
        <p className="ui-input-message text-muted">{helperText}</p>
      ) : null}
    </div>
  );
});

export default Select;
