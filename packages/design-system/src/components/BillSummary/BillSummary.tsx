import React from 'react';
import { cn } from '../../utils/cn';

export interface BillRow {
  label: string;
  value: string;
  emphasis?: 'total' | 'discount';
}

export interface BillSummaryProps {
  rows: BillRow[];
  className?: string;
}

export function BillSummary({ rows, className }: BillSummaryProps) {
  return (
    <div className={className}>
      {rows.map((row) => (
        <div
          key={row.label}
          className={cn('bds-bill-row', row.emphasis === 'total' && 'bds-bill-row--total')}
          style={row.emphasis === 'discount' ? { color: 'var(--bds-color-discount)' } : undefined}
        >
          <span>{row.label}</span>
          <span>{row.value}</span>
        </div>
      ))}
    </div>
  );
}
