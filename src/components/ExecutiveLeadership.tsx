import React from 'react';
import { Link } from 'react-router-dom';
import { Section } from './ui/Section';
import { SectionHeader } from './ui/SectionHeader';
import { ExecutiveCard } from './ui/ExecutiveCard';
import { executiveTeam } from '../config/team';

interface ExecutiveLeadershipProps {
  id?: string;
  compact?: boolean;
}

export const ExecutiveLeadership: React.FC<ExecutiveLeadershipProps> = ({
  id = 'leadership',
  compact = false,
}) => {
  return (
    <Section id={id} background="default" className="relative scroll-mt-24">
      {!compact && (
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-[#FF7A00]/5 to-transparent blur-[80px] pointer-events-none" />
      )}
      <SectionHeader
        label="Leadership"
        title={compact ? 'Built by Operators & Technologists' : 'Led by Operators & Technologists'}
        description={
          compact
            ? 'Enterprise SaaS, AI, and restaurant operations expertise behind BhojanOS.'
            : 'Our team brings together decades of expertise in artificial intelligence, enterprise SaaS, and hands-on restaurant operations.'
        }
      />
      <div className={compact ? 'marketing-leadership-grid' : 'grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8'}>
        {executiveTeam.map((executive) => (
          <ExecutiveCard key={executive.id} executive={executive} compact={compact} />
        ))}
      </div>
      {compact && (
        <p className="text-center mt-6">
          <Link
            to="/about#leadership"
            className="text-sm font-semibold text-[#FF7A00] hover:text-[#ff9533] transition-colors underline-offset-4 hover:underline"
          >
            Read full leadership bios →
          </Link>
        </p>
      )}
    </Section>
  );
};
