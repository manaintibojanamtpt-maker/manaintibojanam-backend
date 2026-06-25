import React from 'react';
import { executiveTeam } from '../config/team';

export const ExecutiveTeamSchema: React.FC = () => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "BhojanOS",
    "url": "https://bhojanos.com",
    "founder": executiveTeam.filter(e => e.title.includes('Founder')).map(e => ({
      "@type": "Person",
      "name": e.name,
      "jobTitle": e.title
    })),
    "employee": executiveTeam.map(e => ({
      "@type": "Person",
      "name": e.name,
      "jobTitle": e.title,
      "description": e.bio
    }))
  };

  return (
    <script 
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};
