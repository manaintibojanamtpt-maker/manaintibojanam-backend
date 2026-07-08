import React from 'react';
import { cn } from '../../utils/cn';

export type BdsButtonVariant = 'primary' | 'secondary' | 'outlined' | 'ghost' | 'danger' | 'fab' | 'appetite';
export type BdsButtonSize = 'default' | 'compact';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BdsButtonVariant;
  size?: BdsButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
}

const variantClass: Record<BdsButtonVariant, string> = {
  primary: 'bds-btn--primary',
  secondary: 'bds-btn--secondary',
  outlined: 'bds-btn--outlined',
  ghost: 'bds-btn--ghost',
  danger: 'bds-btn--danger',
  fab: 'bds-btn--fab bds-btn--primary',
  appetite: 'bds-btn--appetite',
};

export function Button({
  variant = 'primary',
  size = 'default',
  fullWidth = false,
  loading = false,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'bds-btn',
        variantClass[variant],
        size === 'compact' && 'bds-btn--compact',
        fullWidth && 'bds-btn--block',
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? 'Loading…' : children}
    </button>
  );
}
