"use client";

import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUp,
  Sparkles,
  ShoppingBag,
  ArrowUpRight,
  Mail,
  Linkedin,
  Twitter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "../../utils/haptics";
import BhojanOSLogo from "../BhojanOSLogo";
import { orderBhojanPublic } from "../../config/demoData";
import { SUPPORT_EMAIL, SOCIAL_LINKS } from "../../config/support";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const MARQUEE_ITEMS = [
  "Smart Restaurant Operations",
  "Unified POS & Orders",
  "Real-Time Sales Insights",
  "Digital Menu & QR Ordering",
  "Built for Restaurant Growth",
];

const SECONDARY_NAV_LINKS = [
  { label: "Platform", href: "/platform" },
  { label: "Pricing", href: "/pricing" },
  { label: "Contact", href: "/contact" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
];

const DIRECTORY_SECTIONS = [
  {
    title: "Platform",
    links: [
      { label: "Direct Ordering Platform", to: "/direct-ordering-platform" },
      { label: "Online Ordering System", to: "/restaurant-online-ordering" },
      { label: "Restaurant Management", to: "/restaurant-management-system" },
      { label: "Fast Billing & POS", to: "/restaurant-pos" },
      { label: "Digital Menu & QR", to: "/digital-menu-for-restaurants" },
      { label: "Delivery Fleet Routing", to: "/delivery-management-software" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "Cloud Kitchens", to: "/cloud-kitchen-software" },
      { label: "QSR & Fast Food", to: "/qsr-pos-software" },
      { label: "Cafes & Bakeries", to: "/cafe-pos-billing-software" },
      { label: "Multi-Location Chains", to: "/solutions" },
      { label: "WhatsApp Ordering", to: "/whatsapp-food-ordering-system" },
    ],
  },
  {
    title: "Compare & Ecosystem",
    links: [
      { label: "BhojanOS vs Aggregators", to: "/bhojanos-vs-zomato-swiggy" },
      { label: "Petpooja Alternative", to: "/petpooja-alternative" },
      { label: "DotPe Alternative", to: "/dotpe-alternative" },
      { label: "Order Food on OrderBhojan ↗", href: orderBhojanPublic.homeUrl, external: true },
    ],
  },
  {
    title: "Company & Trust",
    links: [
      { label: "About BhojanOS", to: "/about" },
      { label: "Restaurant Insights Blog", to: "/blog" },
      { label: "Security & Sovereignty", to: "/security" },
      { label: "Contact Sales & Support", to: "/contact" },
      { label: "Refund Policy", to: "/refund-policy" },
    ],
  },
];

// Physics-based Magnetic Button Wrapper
interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  href?: string;
  external?: boolean;
  role?: string;
  ariaLabel?: string;
}

const MagneticButton: React.FC<MagneticButtonProps> = ({
  children,
  className,
  onClick,
  href,
  external,
  ariaLabel,
}) => {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const shouldReduceMotion = useReducedMotion();

  const handleMouseMove = (e: React.MouseEvent) => {
    if (shouldReduceMotion || !buttonRef.current) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = buttonRef.current.getBoundingClientRect();
    const x = (clientX - (left + width / 2)) * 0.22;
    const y = (clientY - (top + height / 2)) * 0.22;
    setPosition({ x, y });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  const content = (
    <motion.div
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 180, damping: 14, mass: 0.1 }}
      className={cn("inline-block", className)}
    >
      {children}
    </motion.div>
  );

  if (href) {
    if (external) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={ariaLabel}
          className="inline-block no-underline"
        >
          {content}
        </a>
      );
    }
    return (
      <Link to={href} aria-label={ariaLabel} className="inline-block no-underline">
        {content}
      </Link>
    );
  }

  return (
    <div onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick?.(); }} aria-label={ariaLabel} className="inline-block cursor-pointer">
      {content}
    </div>
  );
};

export interface CinematicFooterProps {
  className?: string;
  onPrimaryCtaClick?: () => void;
  onSecondaryCtaClick?: () => void;
}

export const CinematicFooter: React.FC<CinematicFooterProps> = ({
  className,
  onPrimaryCtaClick,
  onSecondaryCtaClick,
}) => {
  const footerRef = useRef<HTMLElement>(null);
  const bigTextRef = useRef<HTMLDivElement>(null);
  const auroraRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const prefersReduced =
      shouldReduceMotion ||
      (typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    const ctx = gsap.context(() => {
      if (!prefersReduced && footerRef.current) {
        // Parallax depth animation on giant background text
        if (bigTextRef.current) {
          gsap.fromTo(
            bigTextRef.current,
            { y: 60, opacity: 0.02 },
            {
              y: 0,
              opacity: 0.07,
              scrollTrigger: {
                trigger: footerRef.current,
                start: "top bottom",
                end: "bottom bottom",
                scrub: 1,
              },
            }
          );
        }

        // Ambient aurora breath on scroll reveal
        if (auroraRef.current) {
          gsap.fromTo(
            auroraRef.current,
            { scale: 0.85, opacity: 0.25 },
            {
              scale: 1.1,
              opacity: 0.65,
              scrollTrigger: {
                trigger: footerRef.current,
                start: "top 85%",
                end: "bottom bottom",
                scrub: 1.2,
              },
            }
          );
        }

        // Content smooth stagger entrance
        if (contentRef.current) {
          gsap.fromTo(
            contentRef.current,
            { y: 32, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.75,
              ease: "power2.out",
              scrollTrigger: {
                trigger: footerRef.current,
                start: "top 75%",
              },
            }
          );
        }
      }
    }, footerRef);

    return () => {
      ctx.revert();
    };
  }, [shouldReduceMotion]);

  const handleScrollToTop = () => {
    triggerHaptic('light');
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handlePrimaryClick = () => {
    triggerHaptic('medium');
    if (onPrimaryCtaClick) {
      onPrimaryCtaClick();
    } else {
      window.location.href = "/owner/register";
    }
  };

  const handleSecondaryClick = () => {
    triggerHaptic('light');
    if (onSecondaryCtaClick) {
      onSecondaryCtaClick();
    } else {
      const target =
        document.getElementById("platform-features") ||
        document.getElementById("features") ||
        document.getElementById("kds");
      target?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      window.location.href = `mailto:${SUPPORT_EMAIL}?subject=BhojanOS Newsletter&body=Subscribe: ${encodeURIComponent(email)}`;
    }
  };

  return (
    <footer
      ref={footerRef}
      className={cn(
        "relative isolate w-full overflow-hidden bg-[#09090B] text-white pt-20 pb-[max(2.5rem,calc(1.5rem+env(safe-area-inset-bottom)))] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] border-t border-[#27272A] selection:bg-[#D97706]/30 selection:text-white",
        className
      )}
      style={{ color: "#FFFFFF" }}
      aria-label="BhojanOS Footer"
    >
      {/* 1. AMBIENT AURORA GLOW */}
      <div
        ref={auroraRef}
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 -z-10 h-[520px] w-full max-w-6xl rounded-full blur-[140px] opacity-40 transition-opacity"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(217, 119, 6, 0.28) 0%, rgba(245, 158, 11, 0.12) 40%, rgba(16, 185, 129, 0.05) 70%, transparent 85%)",
        }}
        aria-hidden="true"
      />

      {/* Subtle Grid Texture */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #FFFFFF 1px, transparent 1px), linear-gradient(to bottom, #FFFFFF 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
        aria-hidden="true"
      />

      {/* 2. GIANT BACKGROUND TEXT (Scales seamlessly across all devices) */}
      <div
        ref={bigTextRef}
        className="pointer-events-none select-none absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 w-full text-center leading-none overflow-hidden opacity-[0.06] font-black tracking-tighter text-white"
        style={{
          fontSize: "clamp(3.8rem, 17vw, 18rem)",
          letterSpacing: "-0.05em",
        }}
        aria-hidden="true"
      >
        BHOJANOS
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 3. INFINITE RESTAURANT MARQUEE */}
        <div className="relative mb-16 sm:mb-20 overflow-hidden py-3 border-y border-white/10 backdrop-blur-xs">
          {/* Gradient Edge Masks */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-28 bg-gradient-to-r from-[#09090B] to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-28 bg-gradient-to-l from-[#09090B] to-transparent z-10" />

          <div className="marquee-scroll flex items-center whitespace-nowrap">
            {[0, 1, 2].map((trackIndex) => (
              <div key={trackIndex} className="flex items-center gap-8 px-4 shrink-0">
                {MARQUEE_ITEMS.map((item, i) => (
                  <span
                    key={`${trackIndex}-${i}`}
                    className="inline-flex items-center gap-3 text-xs sm:text-sm font-mono tracking-wider uppercase text-zinc-300 hover:text-white transition-colors"
                  >
                    <span>{item}</span>
                    <span className="text-[#D97706] text-xs">✦</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* 4. MAIN CINEMATIC CTA SECTION */}
        <div ref={contentRef} className="mb-20 text-center max-w-3xl mx-auto">
          {/* Brand Emblem */}
          <div className="inline-flex items-center gap-3 mb-6 group">
            <BhojanOSLogo size={36} className="transition-transform duration-300 group-hover:scale-105" />
            <span className="text-2xl font-black tracking-tight text-white">
              Bhojan<span className="bg-gradient-to-r from-[#D97706] to-[#F59E0B] bg-clip-text text-transparent">OS</span>
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1] mb-6">
            Ready to grow your restaurant?
          </h2>

          <p className="text-base sm:text-lg text-zinc-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Take full control of your orders, kitchen operations, customer relationships,
            and profits with India&apos;s sovereign restaurant operating system.
          </p>

          {/* Magnetic Glass-Style Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5">
            <MagneticButton
              onClick={handlePrimaryClick}
              ariaLabel="Start Your Restaurant with BhojanOS"
            >
              <button
                type="button"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#D97706] px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#D97706]/25 transition-all hover:bg-[#B45309] hover:shadow-[#D97706]/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white cursor-pointer active:scale-[0.98]"
                style={{ color: "#FFFFFF", borderRadius: "9999px" }}
              >
                <span>Start Your Restaurant</span>
                <Sparkles size={16} className="text-amber-200" aria-hidden="true" />
              </button>
            </MagneticButton>

            <MagneticButton
              onClick={handleSecondaryClick}
              ariaLabel="Explore BhojanOS Platform Features"
            >
              <button
                type="button"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/25 bg-white/5 px-8 py-3.5 text-sm font-bold text-white backdrop-blur-md transition-all hover:bg-white/15 hover:border-white/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white cursor-pointer active:scale-[0.98]"
                style={{ color: "#FFFFFF", borderRadius: "9999px" }}
              >
                <span>Explore BhojanOS</span>
                <ArrowUpRight size={16} className="text-zinc-400" aria-hidden="true" />
              </button>
            </MagneticButton>
          </div>

          {/* Quick Secondary Navigation Pills */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {SECONDARY_NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:border-[#D97706]/40 hover:bg-[#D97706]/10 transition-all"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* 5. DIRECTORY NAVIGATION GRID & NEWSLETTER */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1fr] gap-12 lg:gap-16 pt-12 pb-16 border-t border-white/10">
          {/* Columns */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            {DIRECTORY_SECTIONS.map((section) => (
              <div key={section.title} className="flex flex-col min-w-0">
                <h3 className="text-xs font-mono font-bold uppercase tracking-[0.18em] text-[#D97706] mb-4">
                  {section.title}
                </h3>
                <ul className="space-y-2.5">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      {link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs sm:text-sm text-zinc-400 hover:text-white transition-colors"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          to={link.to}
                          className="text-xs sm:text-sm text-zinc-400 hover:text-white transition-colors"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Dispatch Bulletin / Social */}
          <div className="flex flex-col justify-between p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
            <div>
              <div className="flex items-center gap-2 mb-2 text-white font-bold text-sm tracking-tight">
                <Mail size={16} className="text-[#D97706]" />
                <span>BhojanOS Kitchen Dispatch</span>
              </div>
              <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                Margin optimization playbooks, direct ordering case studies, and product updates for restaurant owners.
              </p>

              <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@kitchen.com"
                  required
                  aria-label="Email address for newsletter"
                  className="flex-1 min-w-0 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D97706] focus:ring-1 focus:ring-[#D97706]"
                />
                <button
                  type="submit"
                  className="rounded-full bg-white px-5 py-2.5 text-xs font-bold text-[#09090B] hover:bg-zinc-200 transition-colors cursor-pointer"
                >
                  Join
                </button>
              </form>
            </div>

            {/* Social & OrderBhojan links */}
            <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between gap-3">
              <span className="text-[11px] text-zinc-400 font-mono">
                Sovereign Restaurant Network
              </span>
              <div className="flex items-center gap-2">
                {SOCIAL_LINKS.linkedin && (
                  <a
                    href={SOCIAL_LINKS.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="BhojanOS LinkedIn"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-zinc-400 hover:text-white hover:border-white/30 transition-colors"
                  >
                    <Linkedin size={13} />
                  </a>
                )}
                {SOCIAL_LINKS.twitter && (
                  <a
                    href={SOCIAL_LINKS.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="BhojanOS on X (Twitter)"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-zinc-400 hover:text-white hover:border-white/30 transition-colors"
                  >
                    <Twitter size={13} />
                  </a>
                )}
                {SUPPORT_EMAIL && (
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    aria-label="Email BhojanOS Support"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-zinc-400 hover:text-white hover:border-white/30 transition-colors"
                  >
                    <Mail size={13} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 6. BOTTOM BAR (Copyright, Badge, Scroll-to-Top) */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
          <p>© 2026 BhojanOS. All rights reserved.</p>

          {/* Badge: Built for Restaurant Growth */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-white/15 bg-white/5 text-[11px] font-mono font-medium text-zinc-300">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D97706] shadow-xs shadow-[#D97706]" />
            <span>Built for Restaurant Growth</span>
          </div>

          {/* Scroll to Top */}
          <button
            type="button"
            onClick={handleScrollToTop}
            aria-label="Scroll to top of page"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:border-[#D97706] hover:bg-[#D97706]/10 transition-all cursor-pointer group"
          >
            <span>Back to top</span>
            <ArrowUp
              size={14}
              className="text-[#D97706] transition-transform duration-200 group-hover:-translate-y-0.5"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </footer>
  );
};

export const MotionFooter = CinematicFooter;
export default CinematicFooter;
