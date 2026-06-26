import React from 'react';
import { Section } from './ui/Section';
import { SectionHeader } from './ui/SectionHeader';
import { TechBadge } from './ui/TechBadge';
import { technologyStack } from '../config/technology';
import { Code2 } from 'lucide-react';

export const TechnologyStack: React.FC = () => {
  return (
    <Section background="default">
      <SectionHeader 
        label="Architecture"
        title="Powered by Modern Cloud Technologies"
        description="We utilize the most advanced scalable technologies to deliver millisecond response times and robust AI capabilities."
      />
      <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
        {technologyStack.map((tech, i) => (
          <TechBadge key={i} name={tech.name} icon={<Code2 size={16}/>} delay={i * 0.05} />
        ))}
      </div>
      <p className="text-center text-xs text-gray-400 mt-12 font-medium">
        * All product and company names are trademarks™ or registered® trademarks of their respective holders. Use of them does not imply any affiliation with or endorsement by them.
      </p>
    </Section>
  );
};
