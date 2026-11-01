import React from "react";
import { SignIn1 } from "@/components/ui/modern-stunning-sign-in";
import { CinematicHero } from "@/components/ui/cinematic-landing-hero";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import OnboardCard from "@/components/ui/onboard-card";
import { Marquee } from "@/components/ui/marquee";
import { MarqueeDemo } from "@/components/ui/marquee-demo";
import { StackedCards } from "@/components/ui/glass-cards";
import { DefaultDemo, AlternativeDemo } from "@/components/ui/glass-cards-demo";

export const OnboardDemo = () => {
  return (
    <OnboardCard
      duration={3000} // 3sec
      step1="Welcome Aboard"
      step2="Verifying Details"
      step3="Account Created"
    />
  );
};

function Demo() {
  return (
    <div className="flex flex-col gap-8 w-full bg-[#09090B] text-white">
      <StackedCards />
      <MarqueeDemo />
      <SignIn1 />
    </div>
  );
}

export default Demo;
export { 
  Demo, 
  SignIn1, 
  MarqueeDemo, 
  Marquee, 
  StackedCards, 
  DefaultDemo, 
  AlternativeDemo 
};
