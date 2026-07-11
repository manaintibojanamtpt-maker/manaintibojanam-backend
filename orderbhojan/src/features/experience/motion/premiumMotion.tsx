import type React from 'react';
import { m } from 'framer-motion';

export const MotionPage = m.div;
export const MotionReveal = m.div;
export const MotionPress = m.button;

export function GlassSurface({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export const PREMIUM_SPRING = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 28,
};
