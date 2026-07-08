import React from 'react';
import { cn } from '../../utils/cn';
import { Button } from '../Button';

export interface FloatingCTAProps {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function FloatingCTA({ label, onClick, disabled, className }: FloatingCTAProps) {
  return (
    <Button
      variant="primary"
      fullWidth
      disabled={disabled}
      className={cn('bds-floating-cta', className)}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}
