import React, { useCallback } from 'react';
import { cn } from '../../utils/cn';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

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
  onClick,
  ...props
}: ButtonProps) {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || loading) return;
      // Trigger native light haptic feedback if running on Capacitor
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform()) {
        Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
      }
      onClick?.(e);
    },
    [disabled, loading, onClick]
  );

  return (
    <button
      type="button"
      className={cn(
        'bds-btn relative overflow-hidden', // added relative overflow-hidden for ripple
        variantClass[variant],
        size === 'compact' && 'bds-btn--compact',
        fullWidth && 'bds-btn--block',
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={handleClick}
      {...props}
    >
      {loading ? 'Loading…' : children}
    </button>
  );
}

