import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { BhojanOSPricing } from '../ui/pricing';

export const LandingPricing = memo(function LandingPricing() {
  return (
    <div className="relative">
      <BhojanOSPricing />
      <div className="bg-[#09090B] pb-16 text-center border-b border-[#27272A]">
        <Link
          to="/pricing"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#D97706] hover:text-[#F59E0B] transition-colors"
        >
          <span>View full capability breakdown &amp; comparison matrix</span>
          <span>→</span>
        </Link>
      </div>
    </div>
  );
});

export default LandingPricing;
