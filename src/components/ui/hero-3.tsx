import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Button } from './button';

export interface AnimatedMarqueeHeroProps {
  tagline: string;
  title: React.ReactNode;
  description: string;
  ctaText: string;
  images: string[];
  className?: string;
  onCtaClick?: () => void;
  ctaHref?: string;
  secondaryActions?: React.ReactNode;
  backgroundElement?: React.ReactNode;
  children?: React.ReactNode;
}

export const AnimatedMarqueeHero: React.FC<AnimatedMarqueeHeroProps> = ({
  tagline,
  title,
  description,
  ctaText,
  images,
  className,
  onCtaClick,
  ctaHref,
  secondaryActions,
  backgroundElement,
  children,
}) => {
  const shouldReduceMotion = useReducedMotion();

  const FADE_IN_ANIMATION_VARIANTS = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' } },
  };

  // Duplicate images so the marquee tracks seamlessly without gaps
  const marqueeImages = [...images, ...images];

  return (
    <section
      className={cn(
        'relative w-full overflow-hidden bg-white text-center',
        className
      )}
    >
      {/* Optional ambient background video or texture */}
      {backgroundElement}

      {/* Decorative background grid subtle overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:32px_32px]"
      />

      <div className="relative z-10 mx-auto max-w-5xl px-4 pt-8 sm:pt-12 md:pt-16 lg:px-8">
        {/* Tagline pill */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={FADE_IN_ANIMATION_VARIANTS}
          transition={{ delay: shouldReduceMotion ? 0 : 0.1 }}
          className="inline-flex items-center gap-2 rounded-full border border-[#27272A] bg-[#18181B] px-3.5 py-1.5 text-xs font-semibold text-[#FAFAFA] shadow-xs max-w-[90vw] text-left"
        >
          <span className="text-[#D97706] shrink-0">✦</span>
          <span className="truncate">{tagline}</span>
        </motion.div>

        {/* Hero title */}
        <motion.h1
          initial="hidden"
          animate="show"
          variants={FADE_IN_ANIMATION_VARIANTS}
          transition={{ delay: shouldReduceMotion ? 0 : 0.2 }}
          className="mt-6 text-3xl font-extrabold tracking-tight text-[#FAFAFA] sm:text-5xl md:text-6xl lg:text-7xl leading-[1.18] sm:leading-[1.1]"
        >
          {title}
        </motion.h1>

        {/* Hero description */}
        <motion.p
          initial="hidden"
          animate="show"
          variants={FADE_IN_ANIMATION_VARIANTS}
          transition={{ delay: shouldReduceMotion ? 0 : 0.35 }}
          className="mx-auto mt-5 sm:mt-6 max-w-2xl text-sm sm:text-base md:text-lg text-[#A1A1AA] leading-relaxed px-2"
        >
          {description}
        </motion.p>

        {/* CTA Actions */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={FADE_IN_ANIMATION_VARIANTS}
          transition={{ delay: shouldReduceMotion ? 0 : 0.5 }}
          className="relative z-30 mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 px-2"
        >
          {ctaHref ? (
            <Button
              href={ctaHref}
              size="large"
              shape="rounded"
              shadow
              type="primary"
            >
              {ctaText}
            </Button>
          ) : (
            <Button
              onClick={onCtaClick}
              size="large"
              shape="rounded"
              shadow
              type="primary"
            >
              {ctaText}
            </Button>
          )}

          {secondaryActions}
        </motion.div>
      </div>

      {/* Animated image marquee */}
      <div
        aria-hidden="true"
        className="pointer-events-none relative z-10 my-8 sm:my-10 md:my-14 h-40 sm:h-52 md:h-56 w-full overflow-hidden"
      >
        {/* Left & Right gradient masks for smooth edge fade */}
        <div className="absolute inset-y-0 left-0 z-10 w-16 sm:w-24 pointer-events-none bg-gradient-to-r from-white to-transparent" />
        <div className="absolute inset-y-0 right-0 z-10 w-16 sm:w-24 pointer-events-none bg-gradient-to-l from-white to-transparent" />

        <motion.div
          className="absolute bottom-0 flex items-end gap-3 sm:gap-4"
          animate={
            shouldReduceMotion
              ? { x: '0%' }
              : {
                  x: ['-50%', '0%'],
                  transition: {
                    ease: 'linear',
                    duration: 40,
                    repeat: Infinity,
                  },
                }
          }
        >
          {marqueeImages.map((src, index) => {
            // Alternating heights to replicate the organic hero-3 offset
            const heights = ['h-32 sm:h-44', 'h-38 sm:h-50', 'h-34 sm:h-46', 'h-40 sm:h-54'];
            const heightClass = heights[index % heights.length];

            return (
              <div
                key={`marquee-item-${index}`}
                className={cn(
                  'relative shrink-0 overflow-hidden rounded-xl border border-[#E4E4E7] bg-white shadow-md',
                  'w-40 sm:w-56 md:w-64',
                  heightClass
                )}
              >
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover select-none"
                  draggable={false}
                />
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* Embedded Children Slot (Command Deck, Value Ledger, etc.) */}
      {children}
    </section>
  );
};

export default AnimatedMarqueeHero;
