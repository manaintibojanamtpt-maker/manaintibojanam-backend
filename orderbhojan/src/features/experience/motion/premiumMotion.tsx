import { useReducedMotion } from '@bhojan/design-system';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import type { ReactNode } from 'react';

export const PREMIUM_SPRING = { type: 'spring' as const, stiffness: 420, damping: 34, mass: 0.85 };
export const PREMIUM_SPRING_SOFT = { type: 'spring' as const, stiffness: 320, damping: 28, mass: 1 };

export function PremiumMotionRoot({ children }: { readonly children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}

interface MotionRevealProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly delay?: number;
}

export function MotionReveal({ children, className, delay = 0 }: MotionRevealProps) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <div className={className}>{children}</div>;
  }
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12, margin: '-48px' }}
      transition={{ ...PREMIUM_SPRING, delay }}
    >
      {children}
    </m.div>
  );
}

interface MotionPageProps {
  readonly children: ReactNode;
  readonly className?: string;
}

export function MotionPage({ children, className }: MotionPageProps) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <div className={className}>{children}</div>;
  }
  return (
    <m.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </m.div>
  );
}

interface MotionPressProps {
  readonly children: ReactNode;
  readonly className?: string;
}

export function MotionPress({ children, className }: MotionPressProps) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <div className={className}>{children}</div>;
  }
  return (
    <m.div
      className={className}
      whileTap={{ scale: 0.96 }}
      transition={PREMIUM_SPRING_SOFT}
    >
      {children}
    </m.div>
  );
}
