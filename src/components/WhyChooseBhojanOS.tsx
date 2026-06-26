import React from 'react';
import { Section } from './ui/Section';
import { SectionHeader } from './ui/SectionHeader';
import { whyChooseFeatures } from '../config/whyChoose';
import { CheckCircle2 } from 'lucide-react';
import { GlassCard } from './ui/GlassCard';

export const WhyChooseBhojanOS: React.FC = () => {
  return (
    <Section background="subtle">
      <SectionHeader 
        label="Business Outcomes"
        title="Why Restaurants Choose BhojanOS"
        description="We focus on metrics that matter: increasing your revenue and reducing your operational headaches."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {whyChooseFeatures.map((feature, i) => (
          <GlassCard key={i} delay={i * 0.1} hoverEffect={true} className="flex gap-4">
            <CheckCircle2 className="w-6 h-6 text-[#FF6B00] shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400 font-medium">{feature.description}</p>
            </div>
          </GlassCard>
        ))}
      </div>
    </Section>
  );
};
