import React from 'react';
import { Section } from './ui/Section';
import { SectionHeader } from './ui/SectionHeader';
import { GlassCard } from './ui/GlassCard';
import { missionData } from '../config/mission';
import { Target, Eye, Shield, Globe } from 'lucide-react';
import { IconContainer } from './ui/IconContainer';

export const MissionVision: React.FC<{ compactTop?: boolean }> = ({ compactTop }) => {
  return (
    <Section
      background="dark"
      className={`text-white relative overflow-hidden ${compactTop ? '!pt-6 sm:!pt-8' : ''}`}
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-[#FF6B00]/10 to-[#A855F7]/10 rounded-full blur-[100px] pointer-events-none" />
      
      <SectionHeader
        label="Why We Exist"
        title={compactTop ? undefined : 'Built for the Future of Food'}
        description={missionData.mission}
        className={compactTop ? 'mb-6 sm:mb-8' : undefined}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 relative z-10">
        <GlassCard className="bg-white/5 border-white/10">
          <IconContainer className="mb-6 bg-white/10 border-white/20 text-white"><Target /></IconContainer>
          <h3 className="text-2xl font-bold mb-4 text-white">Our Vision</h3>
          <p className="text-neutral-300 leading-relaxed text-lg">{missionData.vision}</p>
        </GlassCard>

        <GlassCard className="bg-white/5 border-white/10">
          <IconContainer className="mb-6 bg-white/10 border-white/20 text-white"><Shield /></IconContainer>
          <h3 className="text-2xl font-bold mb-4 text-white">Core Values</h3>
          <ul className="space-y-3">
            {missionData.values.map((value, i) => (
              <li key={i} className="flex items-center gap-3 text-neutral-300">
                <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B00]" />
                {value}
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>

      <div className="text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 border border-white/10 text-white font-medium">
          <Globe size={18} className="text-[#FF6B00]" />
          {missionData.origin}
        </div>
      </div>
    </Section>
  );
};
