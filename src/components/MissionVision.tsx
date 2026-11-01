import React from 'react';
import { Section } from './ui/Section';
import { SectionHeader } from './ui/SectionHeader';
import { missionData } from '../config/mission';
import { Target, Shield, Globe } from 'lucide-react';

export const MissionVision: React.FC<{ compactTop?: boolean }> = ({ compactTop }) => {
  return (
    <Section
      background="default"
      className={`text-[#FAFAFA] ${compactTop ? '!pt-6 sm:!pt-8' : ''}`}
    >
      <SectionHeader
        label="Why We Exist"
        title={compactTop ? undefined : 'Built for the Future of Food'}
        description={missionData.mission}
        className={compactTop ? 'mb-6 sm:mb-8' : undefined}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="rounded-xl border border-[#27272A] bg-[#111114] p-6 sm:p-8 transition-colors hover:border-[#D97706]/40">
          <div className="w-10 h-10 rounded-lg bg-[#18181B] border border-[#27272A] flex items-center justify-center text-[#D97706] mb-5">
            <Target size={20} />
          </div>
          <h3 className="text-xl font-bold mb-3 text-[#FAFAFA]">Our Vision</h3>
          <p className="text-[#A1A1AA] leading-relaxed text-sm sm:text-base">{missionData.vision}</p>
        </div>

        <div className="rounded-xl border border-[#27272A] bg-[#111114] p-6 sm:p-8 transition-colors hover:border-[#D97706]/40">
          <div className="w-10 h-10 rounded-lg bg-[#18181B] border border-[#27272A] flex items-center justify-center text-[#D97706] mb-5">
            <Shield size={20} />
          </div>
          <h3 className="text-xl font-bold mb-3 text-[#FAFAFA]">Core Values</h3>
          <ul className="space-y-3">
            {missionData.values.map((value, i) => (
              <li key={i} className="flex items-center gap-3 text-sm sm:text-base text-[#A1A1AA]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#D97706] shrink-0" />
                {value}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#18181B] border border-[#27272A] text-[#FAFAFA] font-medium text-sm">
          <Globe size={16} className="text-[#D97706]" />
          {missionData.origin}
        </div>
      </div>
    </Section>
  );
};
