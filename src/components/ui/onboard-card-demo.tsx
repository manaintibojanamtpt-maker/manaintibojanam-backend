"use client";

import React from "react";
import OnboardCard from "@/components/ui/onboard-card";

export const OnboardCardDemo = () => {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-[#09090B] border border-[#27272A] rounded-2xl max-w-md mx-auto shadow-2xl">
      <div className="text-center mb-6">
        <span className="text-[11px] font-mono uppercase tracking-wider text-[#D97706] font-bold">
          BhojanOS Verification Engine
        </span>
        <h3 className="text-lg font-bold text-[#FAFAFA] mt-1">
          Instant Restaurant Onboarding
        </h3>
        <p className="text-xs text-[#A1A1AA] mt-1">
          Live verification of FSSAI, UPI payouts, and digital storefront creation
        </p>
      </div>

      <OnboardCard
        duration={3000}
        step1="Welcome Aboard"
        step2="Verifying Details"
        step3="Account Created"
      />
    </div>
  );
};

export default OnboardCardDemo;
