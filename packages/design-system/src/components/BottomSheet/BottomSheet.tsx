import React from 'react';
import { cn } from '../../utils/cn';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}

export function BottomSheet({ open, onClose, title, children, className }: BottomSheetProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="bds-sheet-overlay" role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn('bds-sheet', className)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bds-sheet__handle" aria-hidden />
        {title ? <h2 className="bds-text-title" style={{ marginBottom: 'var(--bds-space-4)' }}>{title}</h2> : null}
        {children}
      </div>
    </div>
  );
}
