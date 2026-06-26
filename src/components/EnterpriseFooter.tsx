import React from 'react';
import { Link } from 'react-router-dom';

export const EnterpriseFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const sections = [
    {
      title: "Company",
      links: [
        { label: "About", to: "/about" },
        { label: "Leadership", to: "/about#leadership" },
        { label: "Careers", to: "/contact#careers" },
        { label: "Press", to: "#" },
        { label: "Blog", to: "/blog" }
      ]
    },
    {
      title: "Platform",
      links: [
        { label: "Overview", to: "/platform" },
        { label: "Restaurant OS", to: "/platform#os" },
        { label: "AI", to: "/platform#ai" },
        { label: "Analytics", to: "/platform#analytics" },
        { label: "Modules", to: "/platform#modules" }
      ]
    },
    {
      title: "Resources",
      links: [
        { label: "Documentation", to: "/docs" },
        { label: "API", to: "/docs/api" },
        { label: "Developers", to: "/docs/developers" }
      ]
    },
    {
      title: "Support",
      links: [
        { label: "Help Center", to: "#" },
        { label: "Contact", to: "/contact" },
        { label: "Email", to: "mailto:support@bhojanos.com" }
      ]
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy Policy", to: "#" },
        { label: "Terms", to: "#" },
        { label: "Refund Policy", to: "#" },
        { label: "Cookie Policy", to: "#" }
      ]
    },
    {
      title: "Security",
      links: [
        { label: "Security", to: "/security" },
        { label: "Status", to: "#" }
      ]
    }
  ];

  return (
    <footer className="bg-[#030303] border-t border-white/[0.06]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 sm:gap-10 mb-12 sm:mb-16">
          {sections.map((section) => (
            <div key={section.title} className="flex flex-col min-w-0">
              <h4 className="text-white font-semibold text-xs uppercase tracking-[0.15em] mb-4 sm:mb-5">
                {section.title}
              </h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    {link.to.startsWith('mailto:') || link.to === '#' ? (
                      <a
                        href={link.to}
                        className="text-neutral-500 hover:text-[#FF6B00] text-sm font-medium transition-colors"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        to={link.to}
                        className="text-neutral-500 hover:text-[#FF6B00] text-sm font-medium transition-colors"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-white/[0.06] gap-4">
          <span className="text-white font-bold text-lg tracking-tight">
            Bhojan<span className="text-[#FF6B00]">OS</span>
          </span>
          <p className="text-neutral-500 text-sm font-medium text-center sm:text-right">
            © {currentYear} BhojanOS. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
