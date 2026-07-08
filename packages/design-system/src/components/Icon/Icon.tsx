import React from 'react';
import { cn } from '../../utils/cn';

export interface IconProps extends React.SVGAttributes<SVGSVGElement> {
  size?: number;
  label?: string;
}

export function Icon({ size = 20, label, className, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('bds-icon', className)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : 'presentation'}
      {...props}
    >
      {children}
    </svg>
  );
}
