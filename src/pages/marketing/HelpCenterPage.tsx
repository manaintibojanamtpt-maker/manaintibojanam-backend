import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Mail, FileQuestion, BookOpen, Bug, Store } from 'lucide-react';
import { EnterpriseHeader } from '../../components/marketing/EnterpriseHeader';
import { EnterpriseFooter } from '../../components/EnterpriseFooter';
import { MarketingPageHero } from '../../components/marketing/MarketingPageHero';
import { SUPPORT_EMAIL, SUPPORT_WHATSAPP_URL } from '../../config/support';

const faqItems = [
  {
    q: 'How do I register my cloud kitchen?',
    a: 'Create an owner account at /owner/register, complete the 7-step setup wizard, and publish your storefront.',
  },
  {
    q: 'How do customers place orders?',
    a: 'Share your storefront link. Customers browse your menu, add items to cart, and checkout with COD or online payment.',
  },
  {
    q: 'How do I track orders as an owner?',
    a: 'Open Owner Dashboard → Orders for live order management and status updates.',
  },
  {
    q: 'How can customers track their order?',
    a: 'After placing an order, customers receive a tracking link. Guest tracking works without login.',
  },
  {
    q: 'What documents are required for payouts?',
    a: 'Complete Compliance (KYC) with business identity, GST/PAN, bank details, and supporting documents.',
  },
];

const HelpCenterPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#030303] font-sans text-gray-100">
      <EnterpriseHeader />
      <main className="flex-grow marketing-main-offset">
        <MarketingPageHero
          title="Help Center"
          subtitle="Guides, FAQs, and support for restaurant owners and customers on BhojanOS."
        >
          <div className="flex flex-wrap gap-3 justify-center">
            <a
              href={SUPPORT_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366] text-white font-bold py-3 px-6 rounded-xl hover:opacity-90 transition-opacity"
            >
              <MessageCircle size={18} />
              WhatsApp Support
            </a>
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=BhojanOS%20Support`}
              className="inline-flex items-center gap-2 bg-white/10 text-white font-bold py-3 px-6 rounded-xl border border-white/10 hover:bg-white/15 transition-colors"
            >
              <Mail size={18} />
              Email Support
            </a>
          </div>
        </MarketingPageHero>

        <section className="max-w-[900px] mx-auto px-4 sm:px-6 pb-16">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
            <Link
              to="/owner/register"
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-[#FF7A00]/40 transition-colors"
            >
              <Store className="text-[#FF7A00] mb-3" size={22} />
              <h3 className="font-bold text-white mb-1">Owner onboarding</h3>
              <p className="text-sm text-neutral-500">Register and launch your kitchen in minutes.</p>
            </Link>
            <Link
              to="/pricing"
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-[#FF7A00]/40 transition-colors"
            >
              <BookOpen className="text-[#FF7A00] mb-3" size={22} />
              <h3 className="font-bold text-white mb-1">Plans & pricing</h3>
              <p className="text-sm text-neutral-500">Growth trial and subscription options.</p>
            </Link>
            <Link
              to="/owner/feedback"
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-[#FF7A00]/40 transition-colors"
            >
              <Bug className="text-[#FF7A00] mb-3" size={22} />
              <h3 className="font-bold text-white mb-1">Report a bug</h3>
              <p className="text-sm text-neutral-500">Owners can submit feedback from the dashboard.</p>
            </Link>
          </div>

          <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
            <FileQuestion size={20} className="text-[#FF7A00]" />
            Frequently asked questions
          </h2>
          <div className="space-y-3">
            {faqItems.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-white/10 bg-white/[0.02] open:bg-white/[0.04]"
              >
                <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-white flex justify-between items-center">
                  {item.q}
                  <span className="text-neutral-500 group-open:rotate-45 transition-transform text-xl leading-none">+</span>
                </summary>
                <p className="px-5 pb-4 text-sm text-neutral-400 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center">
            <p className="text-sm text-neutral-400 mb-4">
              Legal & policies:{' '}
              <Link to="/terms" className="text-[#FF7A00] hover:underline">Terms</Link>
              {' · '}
              <Link to="/privacy" className="text-[#FF7A00] hover:underline">Privacy</Link>
              {' · '}
              <Link to="/refund-policy" className="text-[#FF7A00] hover:underline">Refund</Link>
              {' · '}
              <Link to="/cancellation-policy" className="text-[#FF7A00] hover:underline">Cancellation</Link>
            </p>
            <Link to="/contact" className="text-sm font-bold text-white hover:text-[#FF7A00]">
              Contact our team →
            </Link>
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
};

export default HelpCenterPage;
