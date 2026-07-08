import React from 'react';
import { cn } from '../../utils/cn';

export interface ToastProps {
  message: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  onDismiss?: () => void;
  className?: string;
}

const variantStyle: Record<NonNullable<ToastProps['variant']>, React.CSSProperties> = {
  default: { borderColor: 'var(--bds-color-border)' },
  success: { borderColor: 'var(--bds-color-success)' },
  warning: { borderColor: 'var(--bds-color-warning)' },
  danger: { borderColor: 'var(--bds-color-danger)' },
};

export function Toast({ message, variant = 'default', onDismiss, className }: ToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('bds-card', className)}
      style={{
        position: 'fixed',
        bottom: 'calc(var(--bds-space-4) + env(safe-area-inset-bottom))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 'var(--bds-z-toast)',
        minWidth: '16rem',
        ...variantStyle[variant],
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--bds-space-3)' }}>
        <span className="bds-text-body-sm">{message}</span>
        {onDismiss ? (
          <button type="button" className="bds-btn bds-btn--ghost bds-btn--compact" onClick={onDismiss} aria-label="Dismiss">
            ×
          </button>
        ) : null}
      </div>
    </div>
  );
}
