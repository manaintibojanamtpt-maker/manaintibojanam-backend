import React from 'react';
import { Section } from './ui/Section';
import { CTAButton } from './ui/CTAButton';

export const CallToAction: React.FC = () => {
  return (
    <Section background="gradient" className="border-t border-black/5 dark:border-white/5 py-32 sm:py-48">
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <h2 className="text-5xl sm:text-6xl md:text-7xl font-black text-white tracking-tighter mb-8 leading-[1.1]">
          Ready to Build the Future of Your Restaurant?
        </h2>
        <p className="text-xl sm:text-2xl text-gray-400 font-medium mb-12 max-w-2xl mx-auto">
          Launch your restaurant with AI-powered operations in minutes.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <CTAButton to="/owner/register" variant="primary" className="w-full sm:w-auto min-w-[200px]">
            Start Free Trial
          </CTAButton>
          <CTAButton to="/contact" variant="outline" className="w-full sm:w-auto min-w-[200px]">
            Book a Demo
          </CTAButton>
        </div>
      </div>
    </Section>
  );
};
