import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Linkedin, Twitter, Mail, ShoppingBag } from 'lucide-react';
import SoftButton from './ui/SoftButton';
import { SUPPORT_EMAIL, SOCIAL_LINKS } from '../config/support';
import { orderBhojanPublic } from '../config/demoData';

export const EnterpriseFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState('');

  const sections = [
    {
      title: 'Platform',
      links: [
        { label: 'Overview', to: '/platform' },
        { label: 'Restaurant OS', to: '/platform#os' },
        { label: 'Pricing', to: '/pricing' },
        { label: 'AI Insights', to: '/onboard#ai' },
        { label: 'Security', to: '/security' },
      ],
      external: [] as Array<{ label: string; href: string }>,
    },
    {
      title: 'For Customers',
      links: [] as Array<{ label: string; to: string }>,
      external: [
        { label: 'Order Food on OrderBhojan', href: orderBhojanPublic.homeUrl },
        { label: 'OrderBhojan — Discover & Order', href: orderBhojanPublic.homeUrl },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', to: '/about' },
        { label: 'Leadership', to: '/about#leadership' },
        { label: 'Contact', to: '/contact' },
      ],
      external: [] as Array<{ label: string; href: string }>,
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy Policy', to: '/privacy-policy' },
        { label: 'Terms', to: '/terms' },
      ],
      external: [] as Array<{ label: string; href: string }>,
    },
  ];

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      window.location.href = `mailto:${SUPPORT_EMAIL}?subject=Newsletter&body=Subscribe: ${encodeURIComponent(email)}`;
    }
  };

  return (
    <footer className="bg-[#030303] border-t border-white/[0.08]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_2fr] gap-10 lg:gap-16 mb-12">
          <div>
            <span className="text-white font-bold text-xl tracking-tight block mb-3">
              Bhojan<span className="text-[#FF7A00]">OS</span>
            </span>
            <p className="text-sm text-neutral-500 leading-relaxed max-w-sm mb-2">
              The operating platform for food businesses.
            </p>
            <p className="text-xs text-neutral-600 leading-relaxed max-w-sm mb-6">
              Restaurants run, manage and grow with BhojanOS. Customers discover and order through OrderBhojan — two connected parts of one ecosystem.
            </p>
            <a
              href={orderBhojanPublic.homeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#FF7A00]/40 bg-[#FF7A00]/10 text-[#FF7A00] text-sm font-bold hover:bg-[#FF7A00]/15 transition-colors mb-6"
            >
              <ShoppingBag size={15} aria-hidden />
              Order Food
            </a>
            <div className="flex items-center gap-3">
              {SOCIAL_LINKS.linkedin ? (
                <a
                  href={SOCIAL_LINKS.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="BhojanOS on LinkedIn"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] text-neutral-400 hover:text-[#FF7A00] hover:border-[#FF7A00]/30 transition-colors min-h-0 min-w-0"
                >
                  <Linkedin size={18} />
                </a>
              ) : null}
              {SOCIAL_LINKS.twitter ? (
                <a
                  href={SOCIAL_LINKS.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="BhojanOS on Twitter"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] text-neutral-400 hover:text-[#FF7A00] hover:border-[#FF7A00]/30 transition-colors min-h-0 min-w-0"
                >
                  <Twitter size={18} />
                </a>
              ) : null}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                aria-label="Email BhojanOS"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] text-neutral-400 hover:text-[#FF7A00] hover:border-[#FF7A00]/30 transition-colors min-h-0 min-w-0"
              >
                <Mail size={18} />
              </a>
            </div>
          </div>

          <form onSubmit={handleNewsletter} className="lg:justify-self-end w-full max-w-md">
            <label htmlFor="footer-newsletter" className="block text-sm font-semibold text-white mb-2">
              Newsletter
            </label>
            <p className="text-xs text-neutral-500 mb-3">Product updates for restaurant operators.</p>
            <div className="flex gap-2">
              <input
                id="footer-newsletter"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@restaurant.com"
                className="flex-1 min-w-0 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/40"
              />
              <SoftButton type="submit" tone="primary" size="compact">
                Subscribe
              </SoftButton>
            </div>
          </form>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {sections.map((section) => (
            <div key={section.title} className="flex flex-col min-w-0">
              <h4 className="text-white font-semibold text-xs uppercase tracking-[0.15em] mb-4">
                {section.title}
              </h4>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-neutral-500 hover:text-[#FF7A00] text-sm font-medium transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                {(section.external || []).map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-500 hover:text-[#FF7A00] text-sm font-medium transition-colors"
                    >
                      {link.label} ↗
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-white/[0.06] gap-3">
          <p className="text-neutral-600 text-xs sm:text-sm text-center sm:text-left">
            © {currentYear} BhojanOS. The operating platform for food businesses.
          </p>
          <p className="text-neutral-600 text-xs">Powered by BhojanOS · OrderBhojan for customers</p>
        </div>
      </div>
    </footer>
  );
};
