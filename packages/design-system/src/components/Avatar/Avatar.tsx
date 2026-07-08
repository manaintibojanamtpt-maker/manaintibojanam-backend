import React from 'react';
import { cn } from '../../utils/cn';

export type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  initials?: string;
  size?: AvatarSize;
}

export function Avatar({ src, alt = '', initials, size = 'md', className, ...props }: AvatarProps) {
  return (
    <div className={cn('bds-avatar', `bds-avatar--${size}`, className)} role="img" aria-label={alt || initials} {...props}>
      {src ? <img src={src} alt={alt} /> : initials}
    </div>
  );
}
