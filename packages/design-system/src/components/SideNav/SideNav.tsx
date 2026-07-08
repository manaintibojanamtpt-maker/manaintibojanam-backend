import React from 'react';
import { cn } from '../../utils/cn';

export interface SideNavItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface SideNavProps {
  brand?: React.ReactNode;
  items: SideNavItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function SideNav({ brand, items, activeId, onChange, className }: SideNavProps) {
  return (
    <aside className={cn('bds-side-nav', className)} aria-label="Primary">
      {brand ? <div style={{ marginBottom: 'var(--bds-space-8)' }}>{brand}</div> : null}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bds-space-2)' }}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="bds-btn bds-btn--ghost"
            style={{
              justifyContent: 'flex-start',
              color: activeId === item.id ? 'var(--bds-color-primary)' : undefined,
              background: activeId === item.id ? 'color-mix(in srgb, var(--bds-color-primary) 12%, transparent)' : undefined,
            }}
            aria-current={activeId === item.id ? 'page' : undefined}
            onClick={() => onChange(item.id)}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
