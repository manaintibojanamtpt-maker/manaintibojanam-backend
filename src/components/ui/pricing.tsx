"use client";
import React, { useRef, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TimelineContent } from "@/components/ui/timeline-animation";
import { VerticalCutReveal } from "@/components/ui/vertical-cut-reveal";
import { cn } from "@/lib/utils";
import NumberFlow from "@number-flow/react";
import { Briefcase, CheckCheck, Database, Server, Sparkles, Zap, ShieldCheck, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { triggerHaptic } from "../../utils/haptics";

export interface PricingPlan {
  name: string;
  badge?: string;
  description: string;
  price: number;
  yearlyPrice: number;
  periodLabel?: string;
  buttonText: string;
  buttonVariant: "default" | "outline" | "primary";
  buttonHref: string;
  popular?: boolean;
  features: { text: string; icon: React.ReactNode }[];
  includes: string[];
}

const BHOJANOS_PLANS: PricingPlan[] = [
  {
    name: "Direct Storefront",
    description: "Launch your branded direct ordering web storefront with 0% aggregator commission.",
    price: 0,
    yearlyPrice: 0,
    buttonText: "Start Free Forever",
    buttonVariant: "outline",
    buttonHref: "/owner/register",
    features: [
      { text: "Branded storefront & digital menu", icon: <Briefcase size={18} /> },
      { text: "100% customer phone & order ownership", icon: <Database size={18} /> },
      { text: "Direct UPI & QR scan ordering", icon: <Zap size={18} /> },
    ],
    includes: [
      "Included with Free Storefront:",
      "Branded online ordering web link",
      "QR code generator for dine-in & takeaway",
      "0% aggregator commission forever",
      "Real-time WhatsApp diner receipt share",
      "Menu item & category management",
      "Basic business hours & store controls",
    ],
  },
  {
    name: "Growth",
    description: "Engineered for active cloud kitchens and restaurants taking live delivery orders.",
    price: 999,
    yearlyPrice: 799,
    buttonText: "Start 14-Day Free Trial",
    buttonVariant: "outline",
    buttonHref: "/owner/register?plan=growth",
    features: [
      { text: "Unlimited direct customer orders", icon: <Briefcase size={18} /> },
      { text: "Kitchen Display Terminal (KDS)", icon: <Server size={18} /> },
      { text: "Automated Shadowfax & Dunzo 3PL riders", icon: <Zap size={18} /> },
    ],
    includes: [
      "Everything in Storefront, plus:",
      "Live order dispatching & rider allocation",
      "Dual thermal receipt printing support",
      "T+0 direct UPI bank settlements",
      "Automated diner WhatsApp order tracking",
      "Customer retention & repeat reorder coupons",
      "Daily revenue and order volume email reports",
    ],
  },
  {
    name: "Pro",
    badge: "Most Popular",
    description: "Best for high-volume restaurants requiring AI kitchen forecasting and multi-station KDS.",
    price: 2999,
    yearlyPrice: 2399,
    popular: true,
    buttonText: "Claim Pro Growth Plan",
    buttonVariant: "primary",
    buttonHref: "/owner/register?plan=pro",
    features: [
      { text: "Multi-station kitchen line routing", icon: <Briefcase size={18} /> },
      { text: "AI sales & prep demand forecasting", icon: <Sparkles size={18} /> },
      { text: "Advanced raw ingredient inventory", icon: <Database size={18} /> },
    ],
    includes: [
      "Everything in Growth, plus:",
      "Predictive prep & ingredient wastage reduction",
      "Multi-terminal offline-first POS sync",
      "Staff PINs and audit trail logging",
      "Custom discounts, combos & happy-hour pricing",
      "Direct WhatsApp remarketing campaigns",
      "Priority 24/7 dedicated telephone support",
    ],
  },
  {
    name: "Enterprise",
    description: "Built for multi-brand cloud kitchens and restaurant chains with centralized control.",
    price: 4999,
    yearlyPrice: 3999,
    buttonText: "Talk to Founders",
    buttonVariant: "outline",
    buttonHref: "/contact",
    features: [
      { text: "Multi-outlet & multi-brand dashboard", icon: <Server size={18} /> },
      { text: "Central commissary inventory transfer", icon: <Database size={18} /> },
      { text: "Custom API & webhook integrations", icon: <ShieldCheck size={18} /> },
    ],
    includes: [
      "Everything in Pro, plus:",
      "Unified brand switching in a single screen",
      "Franchise revenue share & master reports",
      "Custom payment gateway & banking rails",
      "Dedicated account manager & SLA guarantee",
      "Custom POS hardware provisioning support",
      "Full data warehouse sync & export",
    ],
  },
];

const PricingSwitch = ({
  onSwitch,
  className,
}: {
  onSwitch: (value: string) => void;
  className?: string;
}) => {
  const [selected, setSelected] = useState("0");

  const handleSwitch = (value: string) => {
    triggerHaptic('medium');
    setSelected(value);
    onSwitch(value);
  };

  return (
    <div className={cn("flex justify-center", className)}>
      <div className="relative z-10 mx-auto flex w-fit rounded-full bg-[#141417] border border-[#27272A] p-1 shadow-xl">
        <button
          type="button"
          onClick={() => handleSwitch("0")}
          className={cn(
            "relative z-10 w-fit cursor-pointer h-10 rounded-full px-5 py-1.5 font-medium transition-colors text-xs sm:text-sm select-none",
            selected === "0" ? "text-white font-bold" : "text-[#A1A1AA] hover:text-white"
          )}
        >
          {selected === "0" && (
            <motion.span
              layoutId="pricingSwitchHighlight"
              className="absolute inset-0 h-full w-full rounded-full shadow-md shadow-[#D97706]/30 bg-gradient-to-r from-[#D97706] to-[#F59E0B]"
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            />
          )}
          <span className="relative">Monthly Billing</span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitch("1")}
          className={cn(
            "relative z-10 w-fit cursor-pointer h-10 flex-shrink-0 rounded-full px-5 py-1.5 font-medium transition-colors text-xs sm:text-sm select-none",
            selected === "1" ? "text-white font-bold" : "text-[#A1A1AA] hover:text-white"
          )}
        >
          {selected === "1" && (
            <motion.span
              layoutId="pricingSwitchHighlight"
              className="absolute inset-0 h-full w-full rounded-full shadow-md shadow-[#D97706]/30 bg-gradient-to-r from-[#D97706] to-[#F59E0B]"
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            />
          )}
          <span className="relative flex items-center gap-2">
            <span>Yearly Billing</span>
            <span className="rounded-full bg-white/20 border border-white/25 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
              Save 20%
            </span>
          </span>
        </button>
      </div>
    </div>
  );
};

export function BhojanOSPricing() {
  const [isYearly, setIsYearly] = useState(false);
  const pricingRef = useRef<HTMLDivElement>(null);

  const revealVariants = {
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        delay: i * 0.12,
        duration: 0.5,
        ease: "easeOut",
      },
    }),
    hidden: {
      filter: "blur(10px)",
      y: -20,
      opacity: 0,
    },
  };

  const togglePricingPeriod = (value: string) =>
    setIsYearly(Number.parseInt(value, 10) === 1);

  return (
    <section
      className="relative w-full bg-[#09090B] text-[#FAFAFA] py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-t border-b border-[#27272A] overflow-hidden scroll-mt-20 sm:scroll-mt-24"
      ref={pricingRef}
      id="pricing"
    >
      {/* Background ambient lighting */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[#D97706]/[0.06] blur-[150px] rounded-full"
      />

      <div className="max-w-7xl mx-auto relative z-10">
        <article className="text-center mx-auto mb-12 space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D97706]/10 border border-[#D97706]/25 text-[#D97706] text-xs font-mono font-semibold tracking-wider uppercase mb-2">
            <Sparkles size={13} />
            0% Commission · 100% Sovereign Platform
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white font-sans">
            <VerticalCutReveal
              splitBy="words"
              staggerDuration={0.12}
              staggerFrom="first"
              reverse={true}
              containerClassName="justify-center"
              transition={{
                type: "spring",
                stiffness: 250,
                damping: 40,
                delay: 0,
              }}
            >
              Simple transparent pricing for every kitchen.
            </VerticalCutReveal>
          </h2>

          <TimelineContent
            as="p"
            animationNum={0}
            timelineRef={pricingRef}
            customVariants={revealVariants}
            className="text-base sm:text-lg text-[#A1A1AA] max-w-2xl mx-auto"
          >
            Zero commissions on all orders. You pay only for software, kitchen automation, and sales intelligence.
          </TimelineContent>

          <TimelineContent
            as="div"
            animationNum={1}
            timelineRef={pricingRef}
            customVariants={revealVariants}
            className="pt-2"
          >
            <PricingSwitch onSwitch={togglePricingPeriod} className="w-fit mx-auto" />
          </TimelineContent>
        </article>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 py-4">
          {BHOJANOS_PLANS.map((plan, index) => {
            const currentPrice = isYearly ? plan.yearlyPrice : plan.price;

            return (
              <TimelineContent
                key={plan.name}
                as="div"
                animationNum={2 + index}
                timelineRef={pricingRef}
                customVariants={revealVariants}
                className="flex"
              >
                <Card
                  className={cn(
                    "relative flex flex-col justify-between w-full rounded-2xl border transition-all duration-300",
                    plan.popular
                      ? "border-[#D97706] bg-[#141418] shadow-2xl shadow-[#D97706]/15 ring-1 ring-[#D97706]/50"
                      : "border-[#27272A] bg-[#101014] hover:border-[#3F3F46]"
                  )}
                >
                  <CardHeader className="text-left pb-4">
                    <div className="flex items-center justify-between min-h-[28px] mb-2">
                      <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                        {plan.name}
                      </h3>
                      {plan.popular && (
                        <span className="bg-gradient-to-r from-[#D97706] to-[#F59E0B] text-black px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono uppercase tracking-wider shadow-sm">
                          {plan.badge || "Popular"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#A1A1AA] min-h-[38px] leading-relaxed mb-4">
                      {plan.description}
                    </p>

                    <div className="flex items-baseline gap-1 pt-2 pb-1">
                      <span className="text-3xl sm:text-4xl font-extrabold text-white font-mono tracking-tight flex items-baseline">
                        <span className="text-2xl font-sans mr-0.5">₹</span>
                        <NumberFlow
                          value={currentPrice}
                          className="font-mono"
                        />
                      </span>
                      <span className="text-xs text-[#71717A] font-mono">
                        {plan.price === 0 ? " forever" : `/${isYearly ? "mo (billed yearly)" : "month"}`}
                      </span>
                    </div>

                    {/* Features highlight chips */}
                    <div className="space-y-2 pt-4 border-t border-[#27272A]/70">
                      {plan.features.map((feat, fIdx) => (
                        <div key={fIdx} className="flex items-center gap-2 text-xs text-zinc-300 font-medium">
                          <span className="text-[#D97706] shrink-0">{feat.icon}</span>
                          <span className="truncate">{feat.text}</span>
                        </div>
                      ))}
                    </div>
                  </CardHeader>

                  <CardContent className="pt-2 flex flex-col justify-between flex-1">
                    <div className="pt-2 pb-6">
                      <Link
                        to={plan.buttonHref}
                        onClick={() => triggerHaptic("light")}
                        className={cn(
                          "w-full h-11 inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-[0.98] cursor-pointer",
                          plan.popular
                            ? "bg-gradient-to-r from-[#D97706] to-[#F59E0B] hover:from-[#F59E0B] hover:to-[#D97706] text-black shadow-[#D97706]/20"
                            : "bg-[#18181B] hover:bg-[#27272A] text-white border border-[#27272A] hover:border-zinc-500"
                        )}
                      >
                        <span>{plan.buttonText}</span>
                        <ArrowRight size={14} />
                      </Link>
                    </div>

                    <div className="space-y-2.5 pt-4 border-t border-[#27272A]/70">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#D97706] font-mono">
                        {plan.includes[0]}
                      </div>
                      <ul className="space-y-2">
                        {plan.includes.slice(1).map((feature, featureIndex) => (
                          <li key={featureIndex} className="flex items-start text-xs text-[#D4D4D8] leading-tight">
                            <span className="h-4 w-4 bg-[#D97706]/15 border border-[#D97706]/40 rounded-full flex items-center justify-center mr-2 shrink-0 mt-0.5">
                              <CheckCheck size={11} className="text-[#D97706]" />
                            </span>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TimelineContent>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default BhojanOSPricing;
