import React from 'react';
import { Section } from './ui/Section';
import { SectionHeader } from './ui/SectionHeader';
import { GlassCard } from './ui/GlassCard';

export const FounderStory: React.FC = () => {
  return (
    <Section background="dark">
      <SectionHeader 
        label="The Origin"
        title="Built by Operators, For Operators."
      />
      <GlassCard className="max-w-4xl mx-auto bg-white/5 dark:bg-white/5 border-white/10 p-8 md:p-12">
        <div className="prose prose-invert prose-lg max-w-none text-gray-300">
          <p className="font-medium text-xl text-white mb-6">
            "BhojanOS was born out of sheer frustration with the status quo of restaurant software."
          </p>
          <p className="mb-6">
            Running a cloud kitchen is chaotic. We experienced it firsthand. Managing Swiggy, Zomato, walk-ins, and direct orders across multiple tablets while trying to keep track of inventory in a separate spreadsheet was a nightmare. 
          </p>
          <p className="mb-6">
            At the end of the day, reconciling bills, tracking ingredient waste, and trying to understand our actual profit margins took hours of manual work. We realized that restaurants didn't need another Point of Sale system; they needed a unified Operating System.
          </p>
          <p>
            We built BhojanOS to replace the fragmented stack with one intelligent, AI-driven platform. Our vision is to handle the operational chaos so that food entrepreneurs can get back to doing what they love: creating great food and unforgettable guest experiences.
          </p>
          <div className="mt-8 pt-8 border-t border-white/10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-800">
              <img src="/team/vishwa-kalyan.jpg" alt="Vishwa Kalyan" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="text-white font-bold">M. Vishwa Kalyan</div>
              <div className="text-gray-500 text-sm">Founder & CEO</div>
            </div>
          </div>
        </div>
      </GlassCard>
    </Section>
  );
};
