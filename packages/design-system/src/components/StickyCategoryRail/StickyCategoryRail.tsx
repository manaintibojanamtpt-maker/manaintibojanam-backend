import React from 'react';
import { cn } from '../../utils/cn';

export interface CategoryRailItem {
  id: string;
  label: string;
  count?: number;
}

export interface StickyCategoryRailProps {
  items: CategoryRailItem[];
  activeId: string;
  onSelect: (id: string) => void;
  className?: string;
}

export function StickyCategoryRail({ items, activeId, onSelect, className }: StickyCategoryRailProps) {
  return (
    <div className={cn('bds-sticky-category-rail', className)} role="tablist" aria-label="Menu categories">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={activeId === item.id}
          className={cn('bds-sticky-category-rail__chip', activeId === item.id && 'bds-sticky-category-rail__chip--active')}
          onClick={() => onSelect(item.id)}
        >
          {item.label}
          {item.count != null ? ` (${item.count})` : ''}
        </button>
      ))}
    </div>
  );
}
