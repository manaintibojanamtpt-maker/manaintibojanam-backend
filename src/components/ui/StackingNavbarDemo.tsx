import React from 'react';
import { StackingNavbar } from './StackingNavbar';

export const StackingNavbarDemo: React.FC = () => {
  return (
    <section className="py-12 sm:py-16 bg-[#09090B] border-b border-[#27272A] relative overflow-hidden">
      {/* Subtle ambient glow behind stacking navbar */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-32 bg-[#D97706]/10 blur-[90px] rounded-full" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center relative z-10">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#A1A1AA] mb-4 font-mono flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] animate-pulse" />
          Explore the Platform
        </p>
        <div className="flex justify-center w-full overflow-x-auto py-3 px-2 scrollbar-none">
          <StackingNavbar />
        </div>
      </div>
    </section>
  );
};

export default StackingNavbarDemo;
