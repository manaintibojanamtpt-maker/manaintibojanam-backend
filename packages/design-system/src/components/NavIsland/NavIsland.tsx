import React from 'react';
import { cn } from '../../utils/cn';

export interface NavIslandItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface NavIslandProps {
  items: NavIslandItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function NavIsland({ items, activeId, onChange, className }: NavIslandProps) {
  return (
    <div className={cn('bds-nav-island-shell', className)}>
      <nav className="bds-nav-island bds-glass-surface" aria-label="Primary">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn('bds-nav-island__item', activeId === item.id && 'bds-nav-island__item--active')}
            aria-current={activeId === item.id ? 'page' : undefined}
            onClick={() => onChange(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
            {activeId === item.id ? <span className="bds-nav-island__indicator" aria-hidden /> : null}
          </button>
        ))}
      </nav>
    </div>
  );
}
