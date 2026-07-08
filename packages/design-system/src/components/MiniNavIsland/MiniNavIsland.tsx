import React from 'react';
import { cn } from '../../utils/cn';

export interface MiniNavIslandProps {
  onBack?: () => void;
  onHome?: () => void;
  onCart?: () => void;
  className?: string;
}

export function MiniNavIsland({ onBack, onHome, onCart, className }: MiniNavIslandProps) {
  return (
    <nav className={cn('bds-mini-nav-island bds-glass-surface', className)} aria-label="Context navigation">
      <button type="button" className="bds-mini-nav-island__btn" onClick={onBack}>← Back</button>
      <button type="button" className="bds-mini-nav-island__btn" style={{ color: 'var(--bds-color-primary)' }} onClick={onHome}>Home</button>
      <button type="button" className="bds-mini-nav-island__btn" onClick={onCart}>Cart</button>
    </nav>
  );
}
