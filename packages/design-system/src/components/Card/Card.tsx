import React from 'react';
import { cn } from '../../utils/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  glass?: boolean;
}

export function Card({ interactive, glass, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bds-card',
        interactive && 'bds-card--interactive',
        glass && 'bds-card--glass',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('bds-card__header', className)} style={{ marginBottom: 'var(--bds-space-3)' }} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('bds-text-title', className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('bds-text-body-sm', className)} style={{ color: 'var(--bds-color-text-secondary)' }} {...props} />;
}
