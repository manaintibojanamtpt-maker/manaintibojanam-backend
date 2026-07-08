import React from 'react';
import { cn } from '../../utils/cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  circle?: boolean;
}

export function Skeleton({ width = '100%', height = '1rem', circle, className, style, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('bds-skeleton', className)}
      style={{
        width,
        height,
        borderRadius: circle ? '50%' : undefined,
        ...style,
      }}
      aria-hidden
      {...props}
    />
  );
}

export interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
}

export function Loader({ label = 'Loading', className, ...props }: LoaderProps) {
  return (
    <div role="status" aria-live="polite" className={className} {...props}>
      <div className="bds-loader" />
      <span className="bds-sr-only">{label}</span>
    </div>
  );
}
