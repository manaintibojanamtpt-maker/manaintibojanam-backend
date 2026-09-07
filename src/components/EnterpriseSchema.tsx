import React from 'react';

export const EnterpriseSchema: React.FC = () => {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://www.bhojanos.com/#organization",
        "name": "BhojanOS",
        "url": "https://www.bhojanos.com",
        "logo": "https://www.bhojanos.com/bhojan-os-icon.png",
        "description": "BhojanOS is the operating platform and direct online ordering system for restaurants, cloud kitchens, and food businesses.",
        "knowsAbout": ["food business technology", "restaurant management", "direct food ordering", "restaurant operating system", "cloud kitchen operations"],
        "founder": [
          {
            "@type": "Person",
            "name": "M. Vishwa Kalyan",
            "jobTitle": "Founder & CEO"
          },
          {
            "@type": "Person",
            "name": "Lakshmi Prasanna",
            "jobTitle": "Co-Founder & CFO"
          }
        ]
      },
      {
        "@type": "SoftwareApplication",
        "name": "BhojanOS",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web Browser, Progressive Web App (PWA)",
        "url": "https://www.bhojanos.com",
        "description": "Direct restaurant online ordering platform, POS billing, kitchen display system, and delivery dispatch.",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "INR",
          "description": "0% commission on direct online orders. Transparent software subscription for advanced operations.",
          "url": "https://www.bhojanos.com/pricing"
        }
      },
      {
        "@type": "WebSite",
        "@id": "https://www.bhojanos.com/#website",
        "url": "https://www.bhojanos.com",
        "name": "BhojanOS",
        "publisher": {
          "@id": "https://www.bhojanos.com/#organization"
        }
      }
    ]
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
  );
};
