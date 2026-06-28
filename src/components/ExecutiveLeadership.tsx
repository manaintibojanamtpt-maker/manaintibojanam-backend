import React from 'react';
import { Section } from './ui/Section';
import { SectionHeader } from './ui/SectionHeader';
import { ExecutiveCard } from './ui/ExecutiveCard';
import { executiveTeam } from '../config/team';

interface ExecutiveLeadershipProps {
  id?: string;
}

export const ExecutiveLeadership: React.FC<ExecutiveLeadershipProps> = ({ id = 'leadership' }) => {
  return (
    <Section id={id} background="default" className="relative scroll-mt-24">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-[#FF6B00]/5 to-transparent blur-[80px] pointer-events-none" />
      <SectionHeader 
        label="Leadership"
        title="Led by Operators & Technologists"
        description="Our team brings together decades of expertise in artificial intelligence, enterprise SaaS, and hands-on restaurant operations."
      />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
          {executiveTeam.map((executive) => (
            <ExecutiveCard key={executive.id} executive={executive} />
          ))}
        </div>
    </Section>
  );
};
