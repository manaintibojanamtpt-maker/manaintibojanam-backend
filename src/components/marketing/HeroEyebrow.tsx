import React from 'react';

interface HeroEyebrowProps {
  children: React.ReactNode;
}

/** Mobile-safe hero label — wraps cleanly, no vertical clip from tight line-height. */
export const HeroEyebrow: React.FC<HeroEyebrowProps> = ({ children }) => (
  <div className="mx-auto mb-6 sm:mb-8 w-full max-w-[min(100%,22rem)] sm:max-w-2xl rounded-lg border border-white/[0.08] bg-[#0A0A0A] px-3.5 py-2.5 sm:px-4 sm:py-2.5">
    <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.08em] sm:tracking-[0.14em] leading-[1.5] text-neutral-400 text-center [text-wrap:balance]">
      {children}
    </p>
  </div>
);
