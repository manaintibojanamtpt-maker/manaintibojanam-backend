import React from 'react';
import { Section } from './ui/Section';
import { SectionHeader } from './ui/SectionHeader';
import { GlassCard } from './ui/GlassCard';
import { executiveTeam } from '../config/team';

const founder = executiveTeam.find((member) => member.id === 'vishwa-kalyan');

export const FounderStory: React.FC = () => {
  return (
    <Section background="dark">
      <SectionHeader 
        label="The Origin"
        title="Built by Operators, For Operators."
      />
      <GlassCard className="max-w-4xl mx-auto bg-white/5 border-white/10 p-8 md:p-12">
        <div className="max-w-none text-neutral-300 space-y-6 text-base sm:text-lg leading-relaxed">
          <p className="font-medium text-xl text-white">
            "BhojanOS was born out of sheer frustration with the status quo of restaurant software."
          </p>
          <p>
            Running a cloud kitchen is chaotic. We experienced it firsthand. Managing Swiggy, Zomato, walk-ins, and direct orders across multiple tablets while trying to keep track of inventory in a separate spreadsheet was a nightmare.
          </p>
          <p>
            At the end of the day, reconciling bills, tracking ingredient waste, and trying to understand our actual profit margins took hours of manual work. We realized that restaurants didn't need another Point of Sale system; they needed a unified Operating System.
          </p>
          <p>
            We built BhojanOS to replace the fragmented stack with one intelligent, AI-driven platform. Our vision is to handle the operational chaos so that food entrepreneurs can get back to doing what they love: creating great food and unforgettable guest experiences.
          </p>
          {founder && (
            <div className="mt-8 pt-8 border-t border-white/10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-800 shrink-0">
                <img src={founder.imageUrl} alt={founder.alt} className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="text-white font-bold">{founder.name}</div>
                <div className="text-neutral-500 text-sm">Founder & CEO</div>
              </div>
            </div>
          )}
        </div>
      </GlassCard>
    </Section>
  );
};
