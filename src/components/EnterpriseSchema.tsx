import React from 'react';

export const EnterpriseSchema: React.FC = () => {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://bhojanos.com/#organization",
        "name": "BhojanOS",
        "url": "https://bhojanos.com",
        "logo": "https://bhojanos.com/logo.png",
        "description": "BhojanOS is the operating platform for independent food businesses. Powers restaurants, brands and food entrepreneurs, connected to customers through OrderBhojan.",
        "knowsAbout": ["food business technology", "restaurant management", "direct food ordering", "restaurant operating system"],
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
        "operatingSystem": "Web, iOS, Android",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        }
      },
      {
        "@type": "WebSite",
        "@id": "https://bhojanos.com/#website",
        "url": "https://bhojanos.com",
        "name": "BhojanOS",
        "publisher": {
          "@id": "https://bhojanos.com/#organization"
        }
      }
    ]
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
  );
};
