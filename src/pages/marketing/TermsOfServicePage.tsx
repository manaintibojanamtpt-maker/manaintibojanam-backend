import React, { useEffect } from 'react';
import { EnterpriseHeader } from '../../components/marketing/EnterpriseHeader';
import { EnterpriseFooter } from '../../components/EnterpriseFooter';
import { FileText } from 'lucide-react';

const TermsOfServicePage: React.FC = () => {
  useEffect(() => {
    document.title = 'Terms of Service | BhojanOS';
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#070504] text-white font-sans selection:bg-[#FF7A00]/20">
      <EnterpriseHeader />

      <main className="flex-grow marketing-main-offset pt-10 sm:pt-14 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#FF7A00]/10 text-[#FF7A00] flex items-center justify-center border border-[#FF7A00]/20">
            <FileText size={20} />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#FF7A00]">Terms &amp; Agreements</span>
        </div>

        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-4">
          Terms of Service
        </h1>
        <p className="text-sm text-white/50 mb-10">Last updated: September 2026 · BhojanOS Platform</p>

        <div className="space-y-8 text-sm sm:text-base text-white/75 leading-relaxed">
          <section className="rounded-2xl border border-white/[0.08] bg-[#0c0907] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-3">1. Nature of the BhojanOS Service</h2>
            <p>
              BhojanOS provides technology infrastructure, software tools, digital storefronts, and point-of-sale systems for independent restaurants, cloud kitchens, and food businesses. BhojanOS is a technology provider, not a food preparation facility or a common carrier. Food preparation, hygiene, packaging, and fulfillment are the direct legal responsibility of the respective restaurant partner.
            </p>
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-[#0c0907] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-3">2. Merchant Obligations &amp; FSSAI Compliance</h2>
            <p>
              All food business operators utilizing BhojanOS agree to maintain valid licensing under the Food Safety and Standards Authority of India (FSSAI) and display their FSSAI registration numbers on their digital storefront. Partners agree to fulfill customer orders with accurate pricing, clear allergen disclosure, and adherence to food safety standards.
            </p>
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-[#0c0907] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-3">3. Software Subscriptions &amp; 0% Commission</h2>
            <p>
              BhojanOS does not charge marketplace commissions on direct orders placed through merchant storefronts. Subscription plans, transaction gateway processing fees, or optional premium add-on modules are billed transparently as outlined on our pricing page with no hidden percentage markups.
            </p>
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-[#0c0907] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-3">4. Intellectual Property &amp; Brand Rights</h2>
            <p>
              Restaurant partners retain all trademark, branding, photography, and menu intellectual property rights. By using the service, you grant BhojanOS a limited license to display your menu and branding solely to deliver the ordering service to your customers.
            </p>
          </section>
        </div>
      </main>

      <EnterpriseFooter />
    </div>
  );
};

export default TermsOfServicePage;
