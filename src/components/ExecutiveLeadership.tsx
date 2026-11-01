import React from 'react';
import { Link } from 'react-router-dom';
import { Section } from './ui/Section';
import { SectionHeader } from './ui/SectionHeader';
import { BhojanOSLeadershipCarousel } from './ui/BhojanOSLeadershipCarousel';
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
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-[#D97706]/10 to-transparent blur-[80px] pointer-events-none" />
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
      
      {/* Interactive Circular Leadership Showcase */}
      <BhojanOSLeadershipCarousel members={executiveTeam} compact={compact} />

      {compact && (
        <p className="text-center mt-6">
          <Link
            to="/about#leadership"
            className="text-sm font-semibold text-[#D97706] hover:text-[#F59E0B] transition-colors underline-offset-4 hover:underline inline-flex items-center gap-1.5"
          >
            Read full leadership bios on About page →
          </Link>
        </p>
      )}
    </Section>
  );
};
