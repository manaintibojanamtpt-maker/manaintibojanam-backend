import React, { memo } from 'react';
import { m } from 'framer-motion';
import { ArrowDown, Store, ChefHat, ShoppingBag, User } from 'lucide-react';
import { Section } from '../ui/Section';
import { SectionHeader } from '../ui/SectionHeader';
import { orderBhojanPublic } from '../../config/demoData';

export const EcosystemVisual = memo(function EcosystemVisual() {
  return (
    <Section id="ecosystem" background="default" className="scroll-mt-24">
      <SectionHeader
        label="How the ecosystem works"
        title="BhojanOS powers the restaurant. OrderBhojan connects the customer."
        description="Two connected parts of one platform. The restaurant manages everything through BhojanOS. The customer discovers and orders through OrderBhojan."
      />

      <div className="max-w-4xl mx-auto">
        {/* Desktop ecosystem flow */}
        <div className="hidden md:block">
          <div className="flex items-center justify-center gap-4 lg:gap-6">
            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center text-center w-32"
            >
              <div className="w-16 h-16 rounded-2xl bg-[#FF7A00]/10 border border-[#FF7A00]/20 flex items-center justify-center mb-3">
                <Store size={28} className="text-[#FF7A00]" />
              </div>
              <p className="text-sm font-bold text-white">Restaurant</p>
              <p className="text-xs text-neutral-500 mt-1">Food business</p>
            </m.div>
            <ArrowDown size={20} className="text-[#FF7A00] rotate-[-90deg] shrink-0" />
            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="flex flex-col items-center text-center w-40"
            >
              <div className="w-20 h-20 rounded-2xl bg-[#FF7A00]/15 border border-[#FF7A00]/30 flex items-center justify-center mb-3">
                <ChefHat size={32} className="text-[#FF7A00]" />
              </div>
              <p className="text-base font-black text-white">BhojanOS</p>
              <p className="text-xs text-neutral-500 mt-1">Restaurant platform</p>
            </m.div>
            <ArrowDown size={20} className="text-[#FF7A00] rotate-[-90deg] shrink-0" />
            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="flex flex-col items-center text-center w-40"
            >
              <div className="w-20 h-20 rounded-2xl bg-[#FF7A00]/15 border border-[#FF7A00]/30 flex items-center justify-center mb-3">
                <ShoppingBag size={32} className="text-[#FF7A00]" />
              </div>
              <p className="text-base font-black text-white">OrderBhojan</p>
              <p className="text-xs text-neutral-500 mt-1">Customer ordering</p>
            </m.div>
            <ArrowDown size={20} className="text-[#FF7A00] rotate-[-90deg] shrink-0" />
            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="flex flex-col items-center text-center w-32"
            >
              <div className="w-16 h-16 rounded-2xl bg-[#FF7A00]/10 border border-[#FF7A00]/20 flex items-center justify-center mb-3">
                <User size={28} className="text-[#FF7A00]" />
              </div>
              <p className="text-sm font-bold text-white">Customer</p>
              <p className="text-xs text-neutral-500 mt-1">Discovers & orders</p>
            </m.div>
          </div>
        </div>

        {/* Mobile ecosystem flow */}
        <div className="md:hidden flex flex-col items-center gap-3">
          {[
            { icon: Store, label: 'Restaurant', sub: 'Food business' },
            { icon: ChefHat, label: 'BhojanOS', sub: 'Restaurant platform', primary: true },
            { icon: ShoppingBag, label: 'OrderBhojan', sub: 'Customer ordering', primary: true },
            { icon: User, label: 'Customer', sub: 'Discovers & orders' },
          ].map((item, i) => (
            <React.Fragment key={item.label}>
              <m.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className={`flex items-center gap-4 w-full max-w-xs rounded-2xl border p-4 ${
                  item.primary
                    ? 'border-[#FF7A00]/30 bg-[#FF7A00]/[0.06]'
                    : 'border-white/[0.08] bg-white/[0.02]'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  item.primary ? 'bg-[#FF7A00]/20' : 'bg-[#FF7A00]/10'
                }`}>
                  <item.icon size={24} className="text-[#FF7A00]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{item.label}</p>
                  <p className="text-xs text-neutral-500">{item.sub}</p>
                </div>
              </m.div>
              {i < 3 && <ArrowDown size={16} className="text-[#FF7A00]/50" />}
            </React.Fragment>
          ))}
        </div>

        {/* Capabilities */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
            <h3 className="text-sm font-bold text-white mb-3">BhojanOS — For Restaurants</h3>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li className="flex items-start gap-2"><span className="text-[#FF7A00]">•</span> Branded storefront & menu management</li>
              <li className="flex items-start gap-2"><span className="text-[#FF7A00]">•</span> Order queue & kitchen operations</li>
              <li className="flex items-start gap-2"><span className="text-[#FF7A00]">•</span> Inventory & delivery management</li>
              <li className="flex items-start gap-2"><span className="text-[#FF7A00]">•</span> Payments, CRM & marketing tools</li>
              <li className="flex items-start gap-2"><span className="text-[#FF7A00]">•</span> AI insights & demand forecasts</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
            <h3 className="text-sm font-bold text-white mb-3">OrderBhojan — For Customers</h3>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li className="flex items-start gap-2"><span className="text-[#FF7A00]">•</span> Discover local food businesses</li>
              <li className="flex items-start gap-2"><span className="text-[#FF7A00]">•</span> Browse menus with photos & prices</li>
              <li className="flex items-start gap-2"><span className="text-[#FF7A00]">•</span> Place orders directly</li>
              <li className="flex items-start gap-2"><span className="text-[#FF7A00]">•</span> Pay online or cash on delivery</li>
              <li className="flex items-start gap-2"><span className="text-[#FF7A00]">•</span> Save favorites & reorder</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 text-center">
          <a
            href={orderBhojanPublic.homeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#FF7A00] hover:text-[#ff9533] transition-colors"
          >
            Visit OrderBhojan →
          </a>
        </div>
      </div>
    </Section>
  );
});

export default EcosystemVisual;