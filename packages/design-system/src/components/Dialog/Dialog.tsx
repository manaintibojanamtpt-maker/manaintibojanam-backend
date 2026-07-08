import React from 'react';
import { cn } from '../../utils/cn';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function Dialog({ open, onClose, title, description, children, className }: DialogProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="bds-overlay" role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bds-dialog-title"
        aria-describedby={description ? 'bds-dialog-desc' : undefined}
        className={cn('bds-dialog', className)}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="bds-dialog-title" className="bds-text-title" style={{ marginBottom: 'var(--bds-space-2)' }}>
          {title}
        </h2>
        {description ? (
          <p id="bds-dialog-desc" className="bds-text-body-sm" style={{ color: 'var(--bds-color-text-secondary)', marginBottom: 'var(--bds-space-4)' }}>
            {description}
          </p>
        ) : null}
        {children}
      </div>
    </div>
  );
}

export function Modal(props: DialogProps) {
  return <Dialog {...props} />;
}

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children?: React.ReactNode;
  side?: 'left' | 'right';
}

export function Drawer({ open, onClose, title, children, side = 'right' }: DrawerProps) {
  if (!open) return null;
  return (
    <div className="bds-overlay" style={{ justifyContent: side === 'right' ? 'flex-end' : 'flex-start' }} onClick={onClose}>
      <aside
        className="bds-dialog"
        style={{ maxWidth: '20rem', height: '100%', borderRadius: 0 }}
        onClick={(e) => e.stopPropagation()}
        aria-label={title}
      >
        <h2 className="bds-text-title">{title}</h2>
        {children}
      </aside>
    </div>
  );
}
