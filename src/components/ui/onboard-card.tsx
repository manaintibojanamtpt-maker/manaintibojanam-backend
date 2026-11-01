"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { IoMdCheckmark } from "react-icons/io";
import { LuLoader } from "react-icons/lu";

export interface OnboardCardProps {
  duration?: number;
  step1?: string;
  step2?: string;
  step3?: string;
  className?: string;
}

export const OnboardCard = ({
  duration = 3000,
  step1 = "Welcome Aboard",
  step2 = "Verifying Details",
  step3 = "Account Created",
  className,
}: OnboardCardProps) => {
  const [progress, setProgress] = useState(0);
  const [animateKey, setAnimateKey] = useState(0);

  useEffect(() => {
    setProgress(0);
    const forward = setTimeout(() => setProgress(100), 100);
    const reset = setTimeout(() => {
      setAnimateKey((k) => k + 1);
    }, duration + 2000);

    return () => {
      clearTimeout(forward);
      clearTimeout(reset);
    };
  }, [animateKey, duration]);

  return (
    <div
      className={cn(
        "relative",
        "flex flex-col items-center justify-center gap-1 p-1 select-none",
        className
      )}
    >
      {/* Step 3 (Top Card - In Queue / Pending) */}
      <div className="flex min-w-[250px] sm:min-w-[280px] scale-[0.9] flex-col justify-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-gradient-to-br from-neutral-100 to-neutral-50 dark:from-neutral-900 dark:to-neutral-950 py-2.5 pl-3.5 pr-12 opacity-80 shadow-sm">
        <div className="flex items-center justify-start gap-2 text-xs font-medium text-neutral-600 dark:text-neutral-300">
          <div className="text-amber-500">
            <LuLoader className="size-3.5" />
          </div>
          <div>{step3}</div>
        </div>
        <div
          className="ml-5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
        />
      </div>

      {/* Step 2 (Middle Card - Active In Progress) */}
      <div className="flex min-w-[250px] sm:min-w-[280px] flex-col justify-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-700/80 bg-gradient-to-br from-neutral-100 to-neutral-50 dark:from-neutral-900 dark:to-neutral-950 py-3 pl-3.5 pr-12 shadow-md">
        <div className="flex items-center justify-start gap-2 text-xs font-semibold text-neutral-900 dark:text-neutral-100">
          <div className="animate-spin text-amber-500">
            <LuLoader className="size-3.5" />
          </div>
          <div>{step2}</div>
        </div>
        <div
          className="ml-5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
        >
          <motion.div
            key={animateKey}
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: duration / 1000, ease: "easeInOut" }}
          />
        </div>
      </div>

      {/* Step 1 (Bottom Card - Completed) */}
      <div className="flex min-w-[250px] sm:min-w-[280px] scale-[0.9] flex-col justify-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-gradient-to-br from-neutral-100 to-neutral-50 dark:from-neutral-900 dark:to-neutral-950 py-2.5 pl-3.5 pr-12 opacity-80 shadow-sm">
        <div className="flex items-center justify-start gap-2 text-xs font-medium text-neutral-600 dark:text-neutral-300">
          <div className="relative flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="8" fill="#10B981" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <IoMdCheckmark className="size-2.5" />
            </div>
          </div>
          <div>{step1}</div>
        </div>
        <div
          className="ml-5 h-1.5 w-full overflow-hidden rounded-full bg-emerald-500"
        />
      </div>

      {/* Fading gradient masks for depth */}
      <div className="pointer-events-none absolute top-0 h-[40%] w-full bg-gradient-to-b from-[#09090B]/60 via-[#09090B]/20 to-transparent" />
      <div className="pointer-events-none absolute bottom-0 h-[40%] w-full bg-gradient-to-t from-[#09090B]/60 via-[#09090B]/20 to-transparent" />
    </div>
  );
};

export default OnboardCard;
