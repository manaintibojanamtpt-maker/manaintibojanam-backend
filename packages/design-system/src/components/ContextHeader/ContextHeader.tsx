import React from 'react';
import { cn } from '../../utils/cn';
import { Button } from '../Button';

export interface ContextHeaderProps {
  title?: string;
  scrolled?: boolean;
  onBack?: () => void;
  endSlot?: React.ReactNode;
  className?: string;
}

export function ContextHeader({ title, scrolled, onBack, endSlot, className }: ContextHeaderProps) {
  return (
    <header className={cn('bds-context-header bds-safe-top', scrolled && 'bds-context-header--scrolled', className)}>
      {onBack ? (
        <Button variant="ghost" size="compact" onClick={onBack} aria-label="Go back">
          ←
        </Button>
      ) : null}
      {title && scrolled ? <div className="bds-text-subtitle" style={{ fontWeight: 700 }}>{title}</div> : null}
      <div style={{ marginLeft: 'auto' }}>{endSlot}</div>
    </header>
  );
}
