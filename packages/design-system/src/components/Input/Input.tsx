import React from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  return (
    <div className="bds-input-wrap">
      {label ? (
        <label htmlFor={inputId} className="bds-input-label">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={cn('bds-input', error && 'bds-input--error', className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...props}
      />
      {error ? (
        <span id={`${inputId}-error`} className="bds-text-caption" style={{ color: 'var(--bds-color-danger)' }}>
          {error}
        </span>
      ) : hint ? (
        <span id={`${inputId}-hint`} className="bds-text-caption" style={{ color: 'var(--bds-color-text-secondary)' }}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export interface SearchBarProps extends Omit<InputProps, 'type'> {
  onSearch?: (value: string) => void;
}

export function SearchBar({ className, onSearch, onChange, ...props }: SearchBarProps) {
  return (
    <Input
      type="search"
      className={cn('bds-search', className)}
      onChange={(e) => {
        onChange?.(e);
        onSearch?.(e.target.value);
      }}
      {...props}
    />
  );
}

export interface PhoneInputProps extends Omit<InputProps, 'type'> {
  countryCode?: string;
}

export function PhoneInput({ countryCode = '+91', label = 'Phone', ...props }: PhoneInputProps) {
  return (
    <div className="bds-input-wrap">
      <Input label={label} type="tel" inputMode="tel" autoComplete="tel" {...props} />
      <span className="bds-sr-only">Country code {countryCode}</span>
    </div>
  );
}

export interface AddressInputProps extends Omit<InputProps, 'type'> {
  multiline?: boolean;
}

export function AddressInput({ multiline, label = 'Address', ...props }: AddressInputProps) {
  if (multiline) {
    const { className, ...rest } = props;
    return (
      <div className="bds-input-wrap">
        <label className="bds-input-label">{label}</label>
        <textarea className={cn('bds-input', className)} rows={3} {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)} />
      </div>
    );
  }
  return <Input label={label} autoComplete="street-address" {...props} />;
}

export interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export function OTPInput({ length = 6, value, onChange, label = 'One-time password' }: OTPInputProps) {
  const id = React.useId();
  return (
    <div className="bds-input-wrap">
      <label htmlFor={id} className="bds-input-label">
        {label}
      </label>
      <input
        id={id}
        className="bds-input"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={length}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, length))}
        aria-label={label}
      />
    </div>
  );
}
