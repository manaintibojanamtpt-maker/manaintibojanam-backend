import React from 'react';
import { cn } from '../../utils/cn';
import type { TypographyVariant } from '../../tokens/typography';

const variantClass: Record<TypographyVariant, string> = {
  displayHero: 'bds-text-display-hero',
  displayXl: 'bds-text-display-xl',
  display: 'bds-text-display',
  heading: 'bds-text-heading',
  title: 'bds-text-title',
  titleSm: 'bds-text-title-sm',
  subtitle: 'bds-text-subtitle',
  bodyLg: 'bds-text-body',
  body: 'bds-text-body',
  bodySm: 'bds-text-body-sm',
  caption: 'bds-text-caption',
  label: 'bds-text-label',
  microLabel: 'bds-text-micro-label',
  button: 'bds-text-body-sm',
  price: 'bds-text-price',
  priceLg: 'bds-text-price-lg',
  discount: 'bds-text-caption',
  rating: 'bds-text-caption',
};

export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  variant?: TypographyVariant;
  as?: keyof React.JSX.IntrinsicElements;
}

export function Text({ variant = 'body', as: Tag = 'p', className, ...props }: TextProps) {
  return React.createElement(Tag, { className: cn(variantClass[variant], className), ...props });
}

export function Price({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('bds-text-price', className)} {...props} />;
}
