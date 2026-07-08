import React from 'react';
import { cn } from '../../utils/cn';

export interface TopBarProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  start?: React.ReactNode;
  end?: React.ReactNode;
}

export function TopBar({ title, start, end, className, children, ...props }: TopBarProps) {
  return (
    <header className={cn('bds-topbar', className)} {...props}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--bds-space-3)' }}>
        {start}
        {title ? <div className="bds-text-subtitle">{title}</div> : null}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--bds-space-2)' }}>
        {children}
        {end}
      </div>
    </header>
  );
}

export interface BottomNavItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface BottomNavigationProps {
  items: BottomNavItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function BottomNavigation({ items, activeId, onChange, className }: BottomNavigationProps) {
  return (
    <nav className={className} aria-label="Primary">
      <ul style={{ display: 'flex', justifyContent: 'space-around', listStyle: 'none', margin: 0, padding: 'var(--bds-space-2) 0', borderTop: '1px solid var(--bds-color-divider)' }}>
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="bds-btn bds-btn--ghost bds-btn--compact"
              aria-current={activeId === item.id ? 'page' : undefined}
              onClick={() => onChange(item.id)}
            >
              {item.icon}
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol style={{ display: 'flex', gap: 'var(--bds-space-2)', listStyle: 'none', margin: 0, padding: 0, flexWrap: 'wrap' }}>
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="bds-text-caption" style={{ color: 'var(--bds-color-text-secondary)' }}>
            {item.href ? <a href={item.href}>{item.label}</a> : item.label}
            {i < items.length - 1 ? <span aria-hidden> / </span> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Rail({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('bds-rail', className)} {...props}>
      {children}
    </div>
  );
}

export interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  className?: string;
}

export function MetricCard({ label, value, hint, className }: MetricCardProps) {
  return (
    <div className={cn('bds-metric-card', className)}>
      <div className="bds-text-label" style={{ color: 'var(--bds-color-text-secondary)', marginBottom: 'var(--bds-space-2)' }}>{label}</div>
      <div className="bds-metric-card__value">{value}</div>
      {hint ? <p className="bds-text-caption" style={{ color: 'var(--bds-color-text-secondary)', marginTop: 'var(--bds-space-2)' }}>{hint}</p> : null}
    </div>
  );
}
