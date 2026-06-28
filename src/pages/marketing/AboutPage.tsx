import React from 'react';
import { EnterpriseHeader } from '../../components/marketing/EnterpriseHeader';
import { EnterpriseFooter } from '../../components/EnterpriseFooter';
import { MarketingPageHero } from '../../components/marketing/MarketingPageHero';
import { MissionVision } from '../../components/MissionVision';
import { ExecutiveLeadership } from '../../components/ExecutiveLeadership';
import { FounderStory } from '../../components/FounderStory';
import { CompanyTimeline } from '../../components/CompanyTimeline';
import { EnterpriseSchema } from '../../components/EnterpriseSchema';
import { useMarketingHashScroll } from '../../hooks/useMarketingHashScroll';

const AboutPage: React.FC = () => {
  useMarketingHashScroll();

  return (
    <div className="min-h-screen flex flex-col bg-[#030303] font-sans text-gray-100">
      <EnterpriseSchema />
      <EnterpriseHeader />
      <main className="flex-grow marketing-main-offset">
        <MarketingPageHero
          title="Building the Future of Food."
          subtitle="We are operators, engineers, and designers obsessed with empowering the next generation of restaurants."
        />
        <MissionVision compactTop />
        <FounderStory />
        <ExecutiveLeadership />
        <CompanyTimeline />
      </main>
      <EnterpriseFooter />
    </div>
  );
};

export default AboutPage;
