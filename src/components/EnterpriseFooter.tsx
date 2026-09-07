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
      title: 'Products',
      links: [
        { label: 'Online Ordering System', to: '/restaurant-online-ordering' },
        { label: 'Direct Ordering Platform', to: '/direct-ordering-platform' },
        { label: 'Restaurant Management', to: '/restaurant-management-system' },
        { label: 'Restaurant POS & Ops', to: '/restaurant-pos' },
        { label: 'Fast Billing Software', to: '/restaurant-billing-software' },
        { label: 'QR Code Ordering', to: '/qr-code-ordering-system' },
        { label: 'WhatsApp Food Ordering', to: '/whatsapp-food-ordering-system' },
        { label: 'Website Builder', to: '/restaurant-website-builder' },
        { label: 'Digital Menu', to: '/digital-menu-for-restaurants' },
        { label: 'Delivery Management', to: '/delivery-management-software' },
        { label: 'Platform Features', to: '/features' },
        { label: 'Hardware & Integrations', to: '/integrations' },
      ],
      external: [] as Array<{ label: string; href: string }>,
    },
    {
      title: 'Solutions',
      links: [
        { label: 'For Cloud Kitchens', to: '/cloud-kitchen-software' },
        { label: 'For Fast Food & QSR', to: '/qsr-pos-software' },
        { label: 'For Cafes & Bakeries', to: '/cafe-pos-billing-software' },
        { label: 'All Industry Solutions', to: '/solutions' },
        { label: 'Transparent Pricing', to: '/pricing' },
      ],
      external: [] as Array<{ label: string; href: string }>,
    },
    {
      title: 'Compare',
      links: [
        { label: 'BhojanOS vs Zomato & Swiggy', to: '/bhojanos-vs-zomato-swiggy' },
        { label: 'Petpooja Alternative', to: '/petpooja-alternative' },
        { label: 'DotPe Alternative', to: '/dotpe-alternative' },
      ],
      external: [
        { label: 'Order Food (OrderBhojan)', href: orderBhojanPublic.homeUrl },
      ],
    },
    {
      title: 'Company & Legal',
      links: [
        { label: 'About Us', to: '/about' },
        { label: 'Restaurant Blog', to: '/blog' },
        { label: 'Security & Infrastructure', to: '/security' },
        { label: 'Contact Support & Sales', to: '/contact' },
        { label: 'Privacy Policy', to: '/privacy' },
        { label: 'Terms of Service', to: '/terms' },
        { label: 'Refund Policy', to: '/refund-policy' },
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
    <footer className="bg-[#070504] border-t border-white/[0.06]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_2fr] gap-12 lg:gap-16 mb-14">
          <div>
            <span className="font-display text-white font-bold text-2xl tracking-tight block mb-4">
              Bhojan<span className="text-[#FF7A00]">OS</span>
            </span>
            <p className="text-sm text-neutral-400 leading-relaxed max-w-sm mb-3">
              The operating platform for food businesses.
            </p>
            <p className="text-xs text-neutral-500 leading-relaxed max-w-sm mb-8">
              Restaurants run, manage and grow with BhojanOS. Customers discover and order through OrderBhojan — two connected parts of one ecosystem.
            </p>
            <a
              href={orderBhojanPublic.homeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF7A00] text-sm font-bold text-white hover:bg-[#E56D00] transition-colors shadow-[0_8px_28px_-8px_rgba(255,122,0,0.5)] mb-8"
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
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
                      className="text-neutral-400 hover:text-[#FF7A00] text-sm font-medium transition-colors"
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
                      className="text-neutral-400 hover:text-[#FF7A00] text-sm font-medium transition-colors"
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
          <p className="text-neutral-500 text-xs sm:text-sm text-center sm:text-left">
            © {currentYear} BhojanOS. The operating platform for food businesses.
          </p>
          <p className="text-neutral-600 text-xs">Powered by BhojanOS · Order food on OrderBhojan</p>
        </div>
      </div>
    </footer>
  );
};
