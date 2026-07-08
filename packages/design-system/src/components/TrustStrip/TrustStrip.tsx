import React from 'react';
import { cn } from '../../utils/cn';
import { Icon } from '../Icon';
import { Text } from '../Typography';

export interface TrustStripItem {
  readonly id: string;
  readonly label: string;
  readonly icon: React.ReactNode;
}

export interface TrustStripProps {
  readonly items: readonly TrustStripItem[];
  readonly className?: string;
  readonly variant?: 'default' | 'scroll';
  /** Visible icons only; labels exposed to screen readers */
  readonly iconOnly?: boolean;
}

export function TrustStrip({ items, className, variant = 'default', iconOnly = false }: TrustStripProps) {
  return (
    <div
      className={cn(
        'bds-trust-strip',
        variant === 'scroll' && 'bds-trust-strip--scroll',
        iconOnly && 'bds-trust-strip--icon-only',
        className,
      )}
      role="contentinfo"
      aria-label="Trust indicators"
    >
      {items.map((item) => (
        <div key={item.id} className="bds-trust-strip__item" aria-label={iconOnly ? item.label : undefined}>
          <span className="bds-trust-strip__icon" aria-hidden>
            {item.icon}
          </span>
          {iconOnly ? (
            <span className="bds-sr-only">{item.label}</span>
          ) : (
            <Text variant="caption">{item.label}</Text>
          )}
        </div>
      ))}
    </div>
  );
}

export function TrustStarIcon() {
  return (
    <Icon size={20} aria-hidden>
      <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6L12 2z" />
    </Icon>
  );
}

export function TrustShieldIcon() {
  return (
    <Icon size={20} aria-hidden>
      <path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3z" />
    </Icon>
  );
}

export function TrustClockIcon() {
  return (
    <Icon size={20} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Icon>
  );
}

export function TrustDeliveryIcon() {
  return (
    <Icon size={20} aria-hidden>
      <path d="M3 6h11v9H3z" />
      <path d="M14 8h4l2 3v4h-6V8z" />
      <circle cx="7.5" cy="17.5" r="1.5" />
      <circle cx="17.5" cy="17.5" r="1.5" />
    </Icon>
  );
}

export function TrustVerifiedIcon() {
  return (
    <Icon size={20} aria-hidden>
      <path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3z" />
      <path d="m9 12 2 2 4-4" />
    </Icon>
  );
}

export function TrustLiveIcon() {
  return (
    <Icon size={20} aria-hidden>
      <path d="M8.5 14.5A5 5 0 0 1 12 4a5 5 0 0 1 3.5 10.5" />
      <path d="M12 8v4" />
      <circle cx="12" cy="16" r="1" fill="currentColor" stroke="none" />
    </Icon>
  );
}
