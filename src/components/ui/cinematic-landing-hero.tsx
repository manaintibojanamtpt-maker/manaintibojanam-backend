"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

// Re-export the 3D GSAP physical-depth hero
export { CinematicHero, type CinematicHeroProps } from "./cinematic-hero";

export interface CinematicLandingHeroProps {
  tagline: string;
  title: React.ReactNode;
  description: string;
  primaryCtaText: string;
  secondaryCtaText?: string;
  backgroundImage?: string;
  backgroundVideo?: string;
  className?: string;
  buttonShape?: "rounded" | "pill" | "square";
  onPrimaryCtaClick?: () => void;
  onSecondaryCtaClick?: () => void;
  primaryCtaHref?: string;
  secondaryCtaHref?: string;
  children?: React.ReactNode;
}

export const CinematicLandingHero: React.FC<CinematicLandingHeroProps> = ({
  tagline,
  title,
  description,
  primaryCtaText,
  secondaryCtaText,
  backgroundImage = "/images/bhojanos-cinematic-kitchen.jpg",
  backgroundVideo = "https://pub-86dc5b5484314368ac5436a674b0d919.r2.dev/cloudinarry%20to%20cloudflare/202606021731-e_hqa6sn.mp4",
  className,
  buttonShape = "rounded",
  onPrimaryCtaClick,
  onSecondaryCtaClick,
  primaryCtaHref,
  secondaryCtaHref,
  children,
}) => {
  const shouldReduceMotion = useReducedMotion();

  const buttonRadiusClass =
    buttonShape === "square" ? "rounded-lg" : "rounded-full";

  const fadeInVariants = {
    hidden: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 },
    show: {
      opacity: 1,
      y: 0,
      transition: shouldReduceMotion
        ? { duration: 0.1 }
        : {
            type: "spring" as const,
            stiffness: 80,
            damping: 20,
          },
    },
  };

  const handlePrimaryClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onPrimaryCtaClick) {
      onPrimaryCtaClick();
    } else if (primaryCtaHref) {
      window.location.href = primaryCtaHref;
    }
  };

  const handleSecondaryClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onSecondaryCtaClick) {
      onSecondaryCtaClick();
    } else if (secondaryCtaHref) {
      if (secondaryCtaHref.startsWith("#")) {
        const target = document.querySelector(secondaryCtaHref);
        target?.scrollIntoView({ behavior: "smooth" });
      } else {
        window.location.href = secondaryCtaHref;
      }
    }
  };

  return (
    <div className="relative w-full bg-[#09090B]">
      <section
        className={cn(
          "relative isolate flex min-h-[calc(100svh-4.25rem)] lg:h-[calc(100svh-4.25rem)] w-full flex-col justify-center overflow-hidden bg-[#09090B] px-4 pt-20 pb-12 text-white md:px-8 lg:px-12",
          className
        )}
        style={{ color: "#FFFFFF" }}
      >
        {/* Cinematic Background Video with Poster Fallback */}
        <div className="absolute inset-0 -z-20 overflow-hidden pointer-events-none flex justify-end items-center">
          {backgroundVideo ? (
            <video
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              poster={backgroundImage}
              className="h-full w-auto max-w-none aspect-[16/9] object-contain object-right pt-12 pb-2"
              style={{
                maskImage: "linear-gradient(to right, transparent 0%, transparent 12%, black 35%, black 100%)",
                WebkitMaskImage: "linear-gradient(to right, transparent 0%, transparent 12%, black 35%, black 100%)",
              }}
            >
              <source src={backgroundVideo} type="video/mp4" />
            </video>
          ) : (
            <img
              src={backgroundImage}
              alt="BhojanOS kitchen operations background"
              aria-hidden="true"
              loading="eager"
              decoding="async"
              className="h-full w-auto max-w-none aspect-[16/9] object-contain object-right pt-12 pb-2 motion-safe:animate-in"
              style={{
                maskImage: "linear-gradient(to right, transparent 0%, transparent 12%, black 35%, black 100%)",
                WebkitMaskImage: "linear-gradient(to right, transparent 0%, transparent 12%, black 35%, black 100%)",
              }}
            />
          )}
        </div>

        {/* Directional Text Contrast Shield (protects text while keeping character on the right 100% vibrant) */}
        <div
          className="absolute inset-y-0 left-0 w-full sm:w-[65%] lg:w-[50%] -z-10 bg-gradient-to-r from-[#09090B] via-[#09090B] via-30% to-transparent pointer-events-none"
          aria-hidden="true"
        />

        {/* Top Vignette (guarantees crystal-clear header readability) */}
        <div
          className="absolute inset-x-0 top-0 h-24 sm:h-28 -z-10 bg-gradient-to-b from-[#09090B]/95 via-[#09090B]/40 to-transparent pointer-events-none"
          aria-hidden="true"
        />

        {/* Bottom Fade to blend seamlessly with subsequent sections */}
        <div
          className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-t from-[#09090B] to-transparent pointer-events-none"
          aria-hidden="true"
        />

        {/* Ambient Warm Glow behind headline */}
        <div
          className="pointer-events-none absolute -left-20 top-1/4 -z-10 h-[480px] w-[480px] rounded-full bg-[#D97706]/15 blur-[140px]"
          aria-hidden="true"
        />

        {/* Hero Content */}
        <div className="mx-auto w-full max-w-7xl flex flex-col justify-center">
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: {
                transition: {
                  staggerChildren: shouldReduceMotion ? 0 : 0.12,
                },
              },
            }}
            className="max-w-2xl text-left"
          >
            {/* Tagline */}
            <motion.div
              variants={fadeInVariants}
              className="mb-5 inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-white/90 backdrop-blur-md"
              style={{ color: "#FFFFFF" }}
            >
              <span className="h-2 w-2 rounded-full bg-[#D97706] shadow-xs shadow-[#D97706]/50" />
              {tagline}
            </motion.div>

            {/* Main Title */}
            <motion.h1
              variants={fadeInVariants}
              className="text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl drop-shadow-[0_4px_24px_rgba(0,0,0,0.85)]"
              style={{ color: "#FFFFFF" }}
            >
              {title}
            </motion.h1>

            {/* Description */}
            <motion.p
              variants={fadeInVariants}
              className="mt-6 max-w-xl text-base leading-relaxed text-zinc-200 sm:text-lg drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)]"
              style={{ color: "#E4E4E7" }}
            >
              {description}
            </motion.p>

            {/* Call to Action Buttons - Distinctive Pill / Rounded Shape */}
            <motion.div
              variants={fadeInVariants}
              className="mt-8 flex flex-col gap-4 sm:flex-row"
            >
              <button
                type="button"
                onClick={handlePrimaryClick}
                className={cn(
                  "inline-flex min-h-12 items-center justify-center bg-[#D97706] px-8 py-3.5 text-sm font-bold text-white transition-all hover:bg-[#F59E0B] shadow-lg shadow-[#D97706]/25 hover:shadow-[#D97706]/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white cursor-pointer active:scale-[0.98]",
                  buttonRadiusClass
                )}
                style={{ color: "#FFFFFF", borderRadius: buttonShape === "square" ? "0.5rem" : "9999px" }}
              >
                {primaryCtaText}
              </button>

              {secondaryCtaText && (
                <button
                  type="button"
                  onClick={handleSecondaryClick}
                  className={cn(
                    "inline-flex min-h-12 items-center justify-center border border-white/20 bg-black/40 px-8 py-3.5 text-sm font-bold text-white backdrop-blur-xl transition-all hover:bg-white/10 hover:border-white/40 shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white cursor-pointer active:scale-[0.98]",
                    buttonRadiusClass
                  )}
                  style={{ color: "#FFFFFF", borderRadius: buttonShape === "square" ? "0.5rem" : "9999px" }}
                >
                  {secondaryCtaText}
                </button>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Optional Child Elements (e.g. Ledger Chips, KDS Preview) */}
      {children && (
        <div className="relative z-10 w-full bg-[#09090B] pt-6 pb-20 border-b border-[#27272A]">
          {children}
        </div>
      )}
    </div>
  );
};
