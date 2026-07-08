import React from 'react';
import { cn } from '../../utils/cn';

export type BadgeVariant = 'default' | 'veg' | 'nonVeg' | 'offer' | 'delivery' | 'rating' | 'cloudKitchen' | 'status';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClass: Record<BadgeVariant, string> = {
  default: '',
  veg: 'bds-badge--veg',
  nonVeg: 'bds-badge--non-veg',
  offer: 'bds-badge--offer',
  delivery: 'bds-badge--delivery',
  rating: 'bds-badge--rating',
  cloudKitchen: 'bds-badge--offer',
  status: '',
};

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span className={cn('bds-badge', variantClass[variant], className)} {...props}>
      {children}
    </span>
  );
}

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

export function Chip({ selected, className, children, ...props }: ChipProps) {
  return (
    <button type="button" className={cn('bds-chip', selected && 'bds-chip--selected', className)} {...props}>
      {children}
    </button>
  );
}
