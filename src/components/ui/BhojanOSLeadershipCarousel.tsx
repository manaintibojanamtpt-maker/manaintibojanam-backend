"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Linkedin, Mail, Sparkles } from "lucide-react";
import { Executive, executiveTeam } from "../../config/team";
import { cn } from "@/lib/utils";

export interface BhojanOSLeadershipCarouselProps {
  members?: Executive[];
  autoplay?: boolean;
  interval?: number;
  compact?: boolean;
  className?: string;
  onSelectMember?: (member: Executive) => void;
}

export const BhojanOSLeadershipCarousel: React.FC<BhojanOSLeadershipCarouselProps> = ({
  members = executiveTeam,
  autoplay = true,
  interval = 5500,
  compact = false,
  className,
  onSelectMember,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const totalMembers = members.length;

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % totalMembers);
  }, [totalMembers]);

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + totalMembers) % totalMembers);
  }, [totalMembers]);

  const handleSelect = (index: number) => {
    setActiveIndex(index);
    if (onSelectMember && members[index]) {
      onSelectMember(members[index]);
    }
  };

  // Keyboard navigation scoped to this carousel
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      handlePrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      handleNext();
    }
  };

  // Autoplay management
  useEffect(() => {
    if (!autoplay || isPaused || shouldReduceMotion) return;
    const timer = setInterval(handleNext, interval);
    return () => clearInterval(timer);
  }, [autoplay, isPaused, shouldReduceMotion, interval, handleNext]);

  const activeMember = members[activeIndex] || members[0];

  return (
    <div
      ref={containerRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="BhojanOS Leadership Team"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      className={cn(
        "relative w-full max-w-5xl mx-auto py-8 sm:py-12 px-4 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#D97706]/50 rounded-3xl",
        className
      )}
    >
      {/* Ambient background glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-16 -translate-x-1/2 h-48 w-80 sm:w-96 rounded-full bg-[#D97706]/10 blur-[90px]"
        aria-hidden="true"
      />

      {/* CIRCULAR / ORBITAL AVATAR STAGE */}
      <div className="relative mx-auto flex h-48 sm:h-56 w-full max-w-lg items-center justify-center overflow-visible">
        {/* Subtle SVG Orbital Arc Guide */}
        <svg
          className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 w-full h-24 overflow-visible opacity-30"
          viewBox="0 0 500 100"
          fill="none"
          aria-hidden="true"
        >
          <ellipse
            cx="250"
            cy="50"
            rx="210"
            ry="40"
            stroke="url(#orbitGradient)"
            strokeWidth="1.5"
            strokeDasharray="4 8"
          />
          <defs>
            <linearGradient id="orbitGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#27272A" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#D97706" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#27272A" stopOpacity="0.2" />
            </linearGradient>
          </defs>
        </svg>

        {/* Orbiting Leadership Avatars */}
        {members.map((member, index) => {
          // Relative position in circular sequence: 0 is active, 1 is next (right), -1 is prev (left), 2 is behind
          const relativeStep = ((index - activeIndex + totalMembers) % totalMembers);
          const isCenter = relativeStep === 0;
          const isRight = relativeStep === 1;
          const isLeft = relativeStep === totalMembers - 1;
          const isBack = relativeStep > 1 && relativeStep < totalMembers - 1;

          // Trigonometric angle in radians:
          // Center: 0 rad, Right: +65 deg, Left: -65 deg, Back: 180 deg
          let angleRad = 0;
          if (isRight) angleRad = (65 * Math.PI) / 180;
          else if (isLeft) angleRad = (-65 * Math.PI) / 180;
          else if (isBack) angleRad = Math.PI;

          // Responsive orbital radius (smaller on mobile)
          const rx = 150; // base horizontal radius
          const ry = 28;  // base vertical depth
          const x = rx * Math.sin(angleRad);
          const y = ry * (1 - Math.cos(angleRad));

          const scale = isCenter ? 1.08 : isBack ? 0.6 : 0.82;
          const opacity = isCenter ? 1 : isBack ? 0 : 0.55;
          const zIndex = isCenter ? 30 : isBack ? 5 : 20;

          return (
            <motion.div
              key={member.id}
              onClick={() => handleSelect(index)}
              animate={
                shouldReduceMotion
                  ? { opacity, scale }
                  : {
                      x,
                      y,
                      scale,
                      opacity,
                      zIndex,
                    }
              }
              transition={{
                type: "spring",
                stiffness: 220,
                damping: 24,
                mass: 0.8,
              }}
              whileHover={{
                scale: isCenter ? 1.12 : 0.9,
                opacity: isCenter ? 1 : 0.85,
              }}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer select-none",
                isCenter ? "pointer-events-auto" : "pointer-events-auto",
                isBack && "pointer-events-none"
              )}
              style={{ zIndex }}
            >
              <div
                className={cn(
                  "relative rounded-full transition-all duration-300",
                  isCenter
                    ? "ring-4 ring-[#D97706] shadow-[0_0_35px_rgba(217,119,6,0.45)]"
                    : "ring-2 ring-[#27272A] hover:ring-[#D97706]/70 shadow-lg shadow-black/60"
                )}
              >
                {/* Active glow pulse */}
                {isCenter && (
                  <span className="absolute -inset-1 rounded-full bg-gradient-to-tr from-[#D97706] to-[#F59E0B] opacity-30 blur-sm animate-pulse" />
                )}

                <div
                  className={cn(
                    "relative overflow-hidden rounded-full bg-[#18181B] transition-transform",
                    isCenter
                      ? "h-28 w-28 sm:h-36 sm:w-36"
                      : "h-20 w-20 sm:h-24 sm:w-24 grayscale-[25%] hover:grayscale-0"
                  )}
                >
                  <img
                    src={member.imageUrl}
                    alt={member.alt || member.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover object-top"
                  />
                </div>
              </div>

              {/* Minimal active badge below avatar */}
              {isCenter && (
                <motion.span
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 inline-flex items-center gap-1 rounded-full border border-[#D97706]/40 bg-[#D97706]/10 px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase text-[#F59E0B]"
                >
                  <Sparkles size={10} className="text-[#D97706]" />
                  Executive
                </motion.span>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* ANIMATED TESTIMONIAL / LEADERSHIP BIO CARD */}
      <div className="relative mt-6 sm:mt-8 mx-auto w-full max-w-2xl">
        <div className="relative rounded-2xl border border-[#27272A] bg-[#111114]/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl text-center overflow-hidden">
          {/* Subtle top edge specular highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D97706]/40 to-transparent" />

          <AnimatePresence mode="wait">
            <motion.div
              key={activeMember.id}
              initial={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: 14 }
              }
              animate={{ opacity: 1, y: 0 }}
              exit={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: -14 }
              }
              transition={{ duration: 0.32, ease: "easeOut" }}
              className="flex flex-col items-center"
            >
              {/* Leader Full Name */}
              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#FAFAFA] tracking-tight">
                {activeMember.name}
              </h3>

              {/* Official Designation */}
              <p className="mt-1 text-sm sm:text-base font-semibold text-[#D97706] tracking-wide">
                {activeMember.designation}
              </p>

              {/* Leadership Responsibilities */}
              {activeMember.responsibilities && activeMember.responsibilities.length > 0 && (
                <div className="mt-4 flex flex-wrap justify-center gap-1.5 sm:gap-2 max-w-lg">
                  {activeMember.responsibilities.map((resp, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-0.5 text-[11px] font-medium text-zinc-300"
                    >
                      {resp}
                    </span>
                  ))}
                </div>
              )}

              {/* Biography Section */}
              <div className="relative mt-5 pt-4 border-t border-[#27272A]/70 text-center">
                <p className="text-sm sm:text-base leading-relaxed text-zinc-300 font-normal">
                  {activeMember.bio}
                </p>
              </div>

              {/* Professional Links */}
              <div className="mt-5 flex items-center justify-center gap-3">
                {activeMember.linkedIn && (
                  <a
                    href={activeMember.linkedIn}
                    aria-label={`${activeMember.name} on LinkedIn`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition-all hover:border-[#D97706]/50 hover:bg-[#D97706]/10 hover:text-[#D97706] active:scale-95 cursor-pointer"
                  >
                    <Linkedin size={16} />
                  </a>
                )}
                {activeMember.email && (
                  <a
                    href={`mailto:${activeMember.email}`}
                    aria-label={`Email ${activeMember.name}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition-all hover:border-[#D97706]/50 hover:bg-[#D97706]/10 hover:text-[#D97706] active:scale-95 cursor-pointer"
                  >
                    <Mail size={16} />
                  </a>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* NAVIGATION CONTROLS & PAGINATION */}
        <div className="mt-6 flex items-center justify-center gap-4 sm:gap-6">
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous leadership member"
            className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-[#27272A] bg-[#18181B]/90 text-zinc-300 transition-all hover:border-[#D97706]/60 hover:bg-[#27272A] hover:text-white active:scale-95 cursor-pointer shadow-md"
          >
            <ChevronLeft size={20} />
          </button>

          {/* Member Dots */}
          <div className="flex items-center gap-2">
            {members.map((member, index) => {
              const isActive = index === activeIndex;
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => handleSelect(index)}
                  aria-label={`View ${member.name} - ${member.designation}`}
                  className={cn(
                    "h-2.5 rounded-full transition-all cursor-pointer",
                    isActive
                      ? "w-8 bg-[#D97706] shadow-xs shadow-[#D97706]/50"
                      : "w-2.5 bg-zinc-700 hover:bg-zinc-500"
                  )}
                />
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleNext}
            aria-label="Next leadership member"
            className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-[#27272A] bg-[#18181B]/90 text-zinc-300 transition-all hover:border-[#D97706]/60 hover:bg-[#27272A] hover:text-white active:scale-95 cursor-pointer shadow-md"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default BhojanOSLeadershipCarousel;
