import React from 'react';
import { cn } from '../utils/cn';
import { useBdsMotion } from '../providers/MotionProvider';

export function MotionPage({ children, className }: { children: React.ReactNode; className?: string }) {
  const { reducedMotion } = useBdsMotion();
  return (
    <div className={cn(!reducedMotion && 'bds-motion-page-enter', className)}>
      {children}
    </div>
  );
}

export function MotionReveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={cn('bds-motion-page-enter', className)}
      style={delay ? { animationDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}

export function MotionPress({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div className={cn('bds-motion-press', className)} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      {children}
    </div>
  );
}

export function GlassSurface({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('bds-glass-surface', className)}>{children}</div>;
}
