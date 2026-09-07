import React, { useEffect } from 'react';
import { EnterpriseHeader } from '../../components/marketing/EnterpriseHeader';
import { EnterpriseFooter } from '../../components/EnterpriseFooter';
import { RefreshCw } from 'lucide-react';

const RefundPolicyPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Refund & Cancellation Policy | BhojanOS';
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#070504] text-white font-sans selection:bg-[#FF7A00]/20">
      <EnterpriseHeader />

      <main className="flex-grow marketing-main-offset pt-10 sm:pt-14 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#FF7A00]/10 text-[#FF7A00] flex items-center justify-center border border-[#FF7A00]/20">
            <RefreshCw size={20} />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#FF7A00]">Customer Protection</span>
        </div>

        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-4">
          Refund &amp; Cancellation Policy
        </h1>
        <p className="text-sm text-white/50 mb-10">Last updated: September 2026 · BhojanOS Platform</p>

        <div className="space-y-8 text-sm sm:text-base text-white/75 leading-relaxed">
          <section className="rounded-2xl border border-white/[0.08] bg-[#0c0907] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-3">1. Food Order Cancellations &amp; Refunds</h2>
            <p>
              Direct food orders placed via restaurant storefronts are prepared fresh by each kitchen. Orders may be cancelled by the customer prior to kitchen confirmation. Once food preparation has commenced, cancellations are at the sole discretion of the restaurant management. In cases of unfulfilled orders, missing items, or quality disputes, refund requests are reviewed promptly and processed back to the original payment source via Razorpay within 5–7 business days.
            </p>
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-[#0c0907] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-3">2. BhojanOS Software Subscriptions</h2>
            <p>
              BhojanOS offers transparent subscription plans for restaurant operators. Operators may cancel paid software subscriptions at any time from their account dashboard. Cancellations take effect at the conclusion of the current monthly billing period, with no penalties or retroactive lock-in.
            </p>
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-[#0c0907] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-3">3. Dispute Resolution &amp; Support</h2>
            <p>
              For urgent refund inquiries or billing assistance, reach our dedicated support desk at{' '}
              <a href="mailto:support@bhojanos.com" className="text-[#FF7A00] font-semibold underline">
                support@bhojanos.com
              </a>. We respond to all operator and customer inquiries within 24 hours.
            </p>
          </section>
        </div>
      </main>

      <EnterpriseFooter />
    </div>
  );
};

export default RefundPolicyPage;
