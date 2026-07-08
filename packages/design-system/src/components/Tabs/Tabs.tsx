import React from 'react';
import { cn } from '../../utils/cn';

export interface TabItem {
  id: string;
  label: string;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  ariaLabel?: string;
}

export function Tabs({ items, activeId, onChange, className, ariaLabel = 'Tabs' }: TabsProps) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={cn('bds-tabs', className)}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={activeId === item.id}
          disabled={item.disabled}
          className={cn('bds-tab', activeId === item.id && 'bds-tab--active')}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export interface SegmentItem {
  id: string;
  label: string;
}

export interface SegmentedControlProps {
  items: SegmentItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  ariaLabel?: string;
  fullWidth?: boolean;
}

export function SegmentedControl({ items, activeId, onChange, className, ariaLabel = 'Segmented control', fullWidth }: SegmentedControlProps) {
  return (
    <div role="group" aria-label={ariaLabel} className={cn('bds-segmented', fullWidth && 'bds-segmented--full', className)}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={cn('bds-segment', activeId === item.id && 'bds-segment--active')}
          aria-pressed={activeId === item.id}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
