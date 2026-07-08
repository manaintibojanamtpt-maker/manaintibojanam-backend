import React from 'react';
import { cn } from '../../utils/cn';
import { Button } from '../Button';

export interface PremiumEmptyProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function PremiumEmpty({ icon, title, description, actionLabel, onAction, className }: PremiumEmptyProps) {
  return (
    <div className={cn('bds-premium-empty', className)}>
      {icon ? <div className="bds-premium-empty__icon">{icon}</div> : null}
      <h2 className="bds-text-title">{title}</h2>
      {description ? <p className="bds-text-body" style={{ color: 'var(--bds-color-text-secondary)' }}>{description}</p> : null}
      {actionLabel && onAction ? <Button onClick={onAction}>{actionLabel}</Button> : null}
    </div>
  );
}
