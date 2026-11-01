import React, { useEffect } from 'react';
import { EnterpriseHeader } from '../../components/marketing/EnterpriseHeader';
import { EnterpriseFooter } from '../../components/EnterpriseFooter';
import { Shield } from 'lucide-react';

const PrivacyPolicyPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Privacy Policy | BhojanOS';
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#09090B] text-[#FAFAFA] font-sans selection:bg-[#D97706]/30 selection:text-white neone-dark">
      <EnterpriseHeader />

      <main className="flex-grow marketing-main-offset pt-10 sm:pt-14 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#18181B] text-[#D97706] flex items-center justify-center border border-[#27272A]">
            <Shield size={20} />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#D97706] font-mono">Legal Transparency</span>
        </div>

        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#FAFAFA] mb-3">
          Privacy Policy
        </h1>
        <p className="text-sm text-zinc-400 mb-10">Last updated: September 2026 · BhojanOS Technologies</p>

        <div className="space-y-6 text-sm sm:text-base leading-relaxed">
          <section className="rounded-xl border border-[#27272A] bg-[#111114] p-6 sm:p-8 transition-colors hover:border-[#D97706]/40">
            <h2 className="text-lg sm:text-xl font-bold text-[#FAFAFA] mb-3">1. Information We Collect</h2>
            <p className="text-[#A1A1AA]">
              BhojanOS collects information necessary to provide direct online ordering and restaurant management software. For restaurant operators, this includes business contact details, owner name, email, phone number, GST, and bank account details for direct payment settlement. For consumers ordering via direct restaurant storefronts, customer names, phone numbers, and delivery addresses are collected solely to fulfill orders.
            </p>
          </section>

          <section className="rounded-xl border border-[#27272A] bg-[#111114] p-6 sm:p-8 transition-colors hover:border-[#D97706]/40">
            <h2 className="text-lg sm:text-xl font-bold text-[#FAFAFA] mb-3">2. Restaurant Ownership of Customer Data</h2>
            <p className="text-[#A1A1AA]">
              Unlike third-party food delivery aggregators, BhojanOS does not hoard or restrict customer data. Independent restaurant partners own the customer relationships, names, and contact details established through their direct online storefronts. BhojanOS does not sell, broker, or monetize your customer data to competing restaurants or advertisers.
            </p>
          </section>

          <section className="rounded-xl border border-[#27272A] bg-[#111114] p-6 sm:p-8 transition-colors hover:border-[#D97706]/40">
            <h2 className="text-lg sm:text-xl font-bold text-[#FAFAFA] mb-3">3. Payment Security &amp; Compliance</h2>
            <p className="text-[#A1A1AA]">
              All online payment transactions are processed securely through certified, PCI-DSS compliant payment gateways (such as Razorpay). BhojanOS never stores raw credit/debit card numbers or sensitive banking credentials on its servers. Payments settle directly into the restaurant partner’s registered bank account.
            </p>
          </section>

          <section className="rounded-xl border border-[#27272A] bg-[#111114] p-6 sm:p-8 transition-colors hover:border-[#D97706]/40">
            <h2 className="text-lg sm:text-xl font-bold text-[#FAFAFA] mb-3">4. Communications &amp; Messaging</h2>
            <p className="text-[#A1A1AA]">
              Order confirmations, receipts, and live courier tracking links are sent via SMS, WhatsApp, and email to ensure timely order fulfillment. Marketing communications are sent only in compliance with applicable laws and consent guidelines.
            </p>
          </section>

          <section className="rounded-xl border border-[#27272A] bg-[#111114] p-6 sm:p-8 transition-colors hover:border-[#D97706]/40">
            <h2 className="text-lg sm:text-xl font-bold text-[#FAFAFA] mb-3">5. Contact Our Privacy Officer</h2>
            <p className="text-[#A1A1AA]">
              For inquiries regarding data access, corrections, or deletion under Indian data protection laws, please contact our privacy desk at{' '}
              <a href="mailto:support@bhojanos.com" className="text-[#D97706] font-semibold underline hover:text-[#B45309]">
                support@bhojanos.com
              </a>.
            </p>
          </section>
        </div>
      </main>

      <EnterpriseFooter />
    </div>
  );
};

export default PrivacyPolicyPage;
