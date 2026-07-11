import React from 'react';
import { GlassCard } from './GlassCard';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay?: number;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, delay = 0 }) => {
  return (
    <GlassCard delay={delay} className="flex flex-col h-full">
      <div className="w-12 h-12 rounded-xl bg-[#FF6B00]/10 border border-[#FF6B00]/20 flex items-center justify-center text-[#FF6B00] mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
        {title}
      </h3>
      <p className="text-gray-400 font-medium leading-relaxed">
        {description}
      </p>
    </GlassCard>
  );
};
