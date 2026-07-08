import React from 'react';
import { cn } from '../../utils/cn';

export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  active?: boolean;
}

export interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

export function Timeline({ items, className }: TimelineProps) {
  return (
    <ol className={cn('bds-timeline', className)}>
      {items.map((item) => (
        <li key={item.id} className={cn('bds-timeline__item', item.active && 'bds-timeline__item--active')}>
          <span className="bds-timeline__dot" aria-hidden />
          <div>
            <div className="bds-text-body-sm" style={{ fontWeight: 600 }}>{item.title}</div>
            {item.description ? <div className="bds-text-caption" style={{ color: 'var(--bds-color-text-secondary)' }}>{item.description}</div> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
