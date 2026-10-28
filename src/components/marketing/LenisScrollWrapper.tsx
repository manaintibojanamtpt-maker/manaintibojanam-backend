import React, { ReactNode } from 'react';
import { useLenisScroll } from '../../hooks/useLenisScroll';

interface LenisScrollWrapperProps {
  children: ReactNode;
  className?: string;
}

export function LenisScrollWrapper({ children, className = '' }: LenisScrollWrapperProps) {
  const containerRef = useLenisScroll();

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}

export default LenisScrollWrapper;
