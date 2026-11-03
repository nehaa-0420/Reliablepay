import React, { forwardRef } from 'react';

const Input = forwardRef(function Input(
  {
    label,
    error,
    helperText,
    icon: IconProp,
    leftIcon,
    iconRight: IconRightProp,
    rightIcon,
    mono = false,
    className = '',
    id,
    disabled = false,
    required = false,
    ...props
  },
  ref
) {
  const Icon = leftIcon || IconProp;
  const IconRight = rightIcon || IconRightProp;
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`ui-input-wrapper ${disabled ? 'opacity-60' : ''} ${className}`}>
      {label && (
        <label htmlFor={inputId} className="ui-input-label">
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </label>
      )}

      <div className={`ui-input-control ${error ? 'ui-input-error' : ''}`}>
        {Icon && (
          <span className="ui-input-icon-left">
            {React.isValidElement(Icon) ? Icon : <Icon size={16} />}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={`ui-input-element ${mono ? 'font-mono' : ''} ${Icon ? 'pl-9' : ''} ${IconRight ? 'pr-9' : ''}`}
          {...props}
        />

        {IconRight && (
          <span className="ui-input-icon-right">
            {React.isValidElement(IconRight) ? IconRight : <IconRight size={16} />}
          </span>
        )}
      </div>

      {error ? (
        <p className="ui-input-message text-danger">{error}</p>
      ) : helperText ? (
        <p className="ui-input-message text-muted">{helperText}</p>
      ) : null}
    </div>
  );
});

export default Input;
