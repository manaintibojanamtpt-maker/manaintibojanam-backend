import React from 'react';
import { cn } from '../../utils/cn';
import { Icon } from '../Icon';

export interface PremiumSearchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> {
  className?: string;
  variant?: 'floating' | 'sticky';
  onClear?: () => void;
  leadingIcon?: React.ReactNode;
}

export function PremiumSearch({
  className,
  variant = 'floating',
  onClear,
  leadingIcon,
  value,
  ...props
}: PremiumSearchProps) {
  return (
    <label className={cn('bds-premium-search bds-glass-surface', variant === 'floating' && 'bds-premium-search--floating', className)}>
      {leadingIcon ?? (
        <Icon size={18} label="">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </Icon>
      )}
      <input className="bds-premium-search__input" value={value} {...props} />
      {value && onClear ? (
        <button type="button" className="bds-btn bds-btn--ghost bds-btn--compact" onClick={onClear} aria-label="Clear search">
          ×
        </button>
      ) : null}
    </label>
  );
}
