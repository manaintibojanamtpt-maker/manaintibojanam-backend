import React from 'react';
import { Section } from './ui/Section';
import { SectionHeader } from './ui/SectionHeader';
import { whyChooseFeatures } from '../config/whyChoose';
import { CheckCircle2 } from 'lucide-react';

export const WhyChooseBhojanOS: React.FC = () => {
  return (
    <Section background="subtle">
      <SectionHeader 
        label="Why direct ordering wins"
        title="Keep more of every order"
        description="BhojanOS is built for independent kitchens that want their own customers — not another aggregator taking a cut."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {whyChooseFeatures.map((feature, i) => (
          <div key={i} className="flex gap-4 rounded-xl border border-[#27272A] bg-[#111114] p-6 transition-colors hover:border-[#D97706]/40">
            <CheckCircle2 className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base font-bold text-[#FAFAFA] mb-2">{feature.title}</h3>
              <p className="text-sm text-[#A1A1AA] leading-relaxed">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
};
