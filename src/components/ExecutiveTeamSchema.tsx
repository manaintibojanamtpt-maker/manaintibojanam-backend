import React from 'react';
import { executiveTeam } from '../config/team';

export const ExecutiveTeamSchema: React.FC = () => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "BhojanOS",
    "url": "https://bhojanos.com",
    "founder": executiveTeam.filter(e => e.designation.includes('Founder')).map(e => ({
      "@type": "Person",
      "name": e.name,
      "jobTitle": e.designation
    })),
    "employee": executiveTeam.map(e => ({
      "@type": "Person",
      "name": e.name,
      "jobTitle": e.designation,
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
