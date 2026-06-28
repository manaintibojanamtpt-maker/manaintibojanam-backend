import React from 'react';
import { Section } from './ui/Section';
import { SectionHeader } from './ui/SectionHeader';
import { TimelineCard } from './ui/TimelineCard';
import { companyTimeline } from '../config/timeline';

export const CompanyTimeline: React.FC = () => {
  return (
    <Section background="subtle">
      <SectionHeader 
        label="Our Journey"
        title="The Evolution of BhojanOS"
      />
      <div className="max-w-3xl mx-auto ml-4 sm:ml-auto">
        {companyTimeline.map((item, i) => (
          <TimelineCard 
            key={i} 
            year={item.year} 
            title={item.title} 
            description={item.description} 
            isLast={i === companyTimeline.length - 1}
          />
        ))}
      </div>
    </Section>
  );
};
