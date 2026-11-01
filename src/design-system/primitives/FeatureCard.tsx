import React from 'react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay?: number;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => {
  return (
    <div className="flex flex-col h-full rounded-xl border border-[#27272A] bg-[#111114] p-6 transition-all hover:border-[#D97706]/40 shadow-sm text-white">
      <div className="w-10 h-10 rounded-lg bg-[#18181B] border border-[#27272A] flex items-center justify-center text-[#D97706] mb-5 shrink-0">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-[#FAFAFA] mb-2 tracking-tight">
        {title}
      </h3>
      <p className="text-sm text-[#A1A1AA] font-normal leading-relaxed flex-1">
        {description}
      </p>
    </div>
  );
};
