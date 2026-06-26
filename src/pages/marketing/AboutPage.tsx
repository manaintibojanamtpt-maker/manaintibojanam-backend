import React from 'react';
import { EnterpriseHeader } from '../../components/marketing/EnterpriseHeader';
import { EnterpriseFooter } from '../../components/EnterpriseFooter';
import { MissionVision } from '../../components/MissionVision';
import { ExecutiveLeadership } from '../../components/ExecutiveLeadership';
import { FounderStory } from '../../components/FounderStory';
import { CompanyTimeline } from '../../components/CompanyTimeline';
import { EnterpriseSchema } from '../../components/EnterpriseSchema';
import { Section } from '../../components/ui/Section';

const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#030303] font-sans text-gray-900 dark:text-gray-100">
      <EnterpriseSchema />
      <EnterpriseHeader />
      <main className="flex-grow pt-20">
        <Section background="gradient" className="pt-32 pb-16 text-center">
          <h1 className="text-5xl md:text-7xl font-black text-gray-900 dark:text-white tracking-tighter mb-6">
            Building the Future of Food.
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 font-medium max-w-3xl mx-auto">
            We are operators, engineers, and designers obsessed with empowering the next generation of restaurants.
          </p>
        </Section>
        <MissionVision />
        <FounderStory />
        <ExecutiveLeadership />
        <CompanyTimeline />
      </main>
      <EnterpriseFooter />
    </div>
  );
};

export default AboutPage;
