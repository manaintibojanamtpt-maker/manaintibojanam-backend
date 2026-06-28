import React, { memo } from 'react';
import { m } from 'framer-motion';

interface RevealOnScrollProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}

export const RevealOnScroll = memo(function RevealOnScroll({
  children,
  className = '',
  delay = 0,
  y = 24,
}: RevealOnScrollProps) {
  return (
    <m.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </m.div>
  );
});
