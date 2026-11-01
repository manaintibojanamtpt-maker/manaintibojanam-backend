import React from "react";
import { CinematicLandingHero } from "./cinematic-landing-hero";

export const BhojanOSCinematicHero: React.FC<{
  children?: React.ReactNode;
}> = ({ children }) => {
  return (
    <CinematicLandingHero
      tagline="The Operating System for Modern Restaurants"
      title={
        <>
          Your Restaurant.
          <br />
          Your Customers.
          <br />
          Your <span className="text-[#D97706]">BhojanOS.</span>
        </>
      }
      description="Run your restaurant with one connected platform for direct ordering, kitchen operations, payments, delivery, and customer relationships. Keep control of your business while serving more customers."
      primaryCtaText="Start Your Restaurant"
      secondaryCtaText="Explore the Platform"
      backgroundVideo="https://pub-86dc5b5484314368ac5436a674b0d919.r2.dev/cloudinarry%20to%20cloudflare/202606021731-e_hqa6sn.mp4"
      backgroundImage="/images/bhojanos-cinematic-kitchen.jpg"
      onPrimaryCtaClick={() => {
        window.location.href = "/owner/register";
      }}
      onSecondaryCtaClick={() => {
        const target =
          document.getElementById("platform-features") ||
          document.getElementById("features") ||
          document.getElementById("kds");
        target?.scrollIntoView({ behavior: "smooth" });
      }}
    >
      {children}
    </CinematicLandingHero>
  );
};

export default BhojanOSCinematicHero;
