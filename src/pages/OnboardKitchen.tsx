import React, { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  LockKeyhole, TrendingUp, Database, Users, Activity, Check, AlertCircle, ArrowRight
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { CTAButton } from '../components/ui/CTAButton';
import { homepageHero } from '../config/productMessaging';

// Marketing UI Components
import { EnterpriseHeader } from '../components/marketing/EnterpriseHeader';
import { RestaurantProblems } from '../components/RestaurantProblems';
import { MissionVision } from '../components/MissionVision';
import { ProductOverview } from '../components/ProductOverview';
import { WhyChooseBhojanOS } from '../components/WhyChooseBhojanOS';
import { ExecutiveLeadership } from '../components/ExecutiveLeadership';
import { FounderStory } from '../components/FounderStory';
import { TrustSection } from '../components/TrustSection';
import { TechnologyStack } from '../components/TechnologyStack';
import { CallToAction } from '../components/CallToAction';
import { EnterpriseFooter } from '../components/EnterpriseFooter';
import { EnterpriseSchema } from '../components/EnterpriseSchema';

const BrandText = () => (
  <span className="font-semibold text-white tracking-tight">
    Bhojan<span className="text-[#FF6B00]">OS</span>
  </span>
);

// --- Interactive Command Center (logic unchanged, presentation refined) ---
const InteractiveCommandCenter = () => {
  const [activeTab, setActiveTab] = useState('demand');

  const tabs = [
    { id: 'demand', label: 'Demand Prediction', icon: <TrendingUp size={16} /> },
    { id: 'recipe', label: 'Recipe Intelligence', icon: <Database size={16} /> },
    { id: 'customer', label: 'Customer Graph', icon: <Users size={16} /> },
    { id: 'health', label: 'Kitchen Health', icon: <Activity size={16} /> },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto mt-16 sm:mt-20 relative z-10">
      <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl overflow-hidden">
        <div className="h-11 border-b border-white/[0.06] flex items-center px-4 sm:px-6 gap-3 bg-[#080808]">
          <div className="flex gap-1.5 shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
          </div>
          <div className="flex-1 max-w-md mx-auto h-7 rounded-md bg-[#030303] border border-white/[0.06] flex items-center justify-center text-[10px] sm:text-[11px] font-mono text-neutral-500 gap-1.5 px-3 truncate">
            <LockKeyhole size={10} className="shrink-0" />
            <span className="truncate">bhojanos.com/your-kitchen</span>
          </div>
        </div>

        <div className="flex overflow-x-auto scrollbar-hide border-b border-white/[0.06]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                triggerHaptic('light');
                setActiveTab(tab.id);
              }}
              className={`flex shrink-0 items-center gap-2 px-4 sm:px-6 py-3.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'text-white border-[#FF6B00] bg-white/[0.02]'
                  : 'text-neutral-500 hover:text-neutral-300 border-transparent hover:bg-white/[0.02]'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5 sm:p-8 min-h-[360px] sm:min-h-[400px] bg-[#080808]">
          <AnimatePresence mode="wait">
            {activeTab === 'demand' && (
              <m.div key="demand" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} className="h-full">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6 sm:mb-8">
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-white mb-1">Weekend Demand Forecast</h3>
                    <p className="text-sm text-neutral-400">AI projection based on last 4 weekends and current weather patterns.</p>
                  </div>
                  <span className="self-start px-3 py-1 bg-[#FF6B00]/10 border border-[#FF6B00]/25 text-[#FF6B00] rounded-md text-[10px] font-semibold uppercase tracking-wider">
                    High Confidence
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                  <div className="bg-[#0A0A0A] border border-white/[0.06] rounded-lg p-4 sm:p-5">
                    <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">Predicted Orders</div>
                    <div className="text-2xl sm:text-3xl font-bold text-white tabular-nums">450 - 480</div>
                  </div>
                  <div className="bg-[#0A0A0A] border border-white/[0.06] rounded-lg p-4 sm:p-5">
                    <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">Peak Hour</div>
                    <div className="text-2xl sm:text-3xl font-bold text-white tabular-nums">7:30 PM</div>
                  </div>
                  <div className="bg-[#0A0A0A] border border-[#FF6B00]/20 rounded-lg p-4 sm:p-5">
                    <div className="text-[10px] font-semibold text-[#FF6B00] uppercase tracking-wider mb-1">Recommendation</div>
                    <div className="text-sm font-medium text-neutral-200 leading-snug">Increase Biryani prep by 20% due to projected surge.</div>
                  </div>
                </div>

                <div className="h-32 sm:h-40 w-full flex items-end gap-1.5 sm:gap-2">
                  {[20, 30, 25, 45, 60, 90, 80, 50, 30, 20].map((h, i) => (
                    <div key={i} className="flex-1 h-full flex items-end">
                      <div className="w-full bg-[#FF6B00]/15 rounded-t-sm relative" style={{ height: `${h}%` }}>
                        <div className="absolute top-0 w-full h-0.5 bg-[#FF6B00]" />
                      </div>
                    </div>
                  ))}
                </div>
              </m.div>
            )}

            {activeTab === 'recipe' && (
              <m.div key="recipe" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
                <div className="mb-6 sm:mb-8">
                  <h3 className="text-lg sm:text-xl font-semibold text-white mb-1">Live Inventory Deduction</h3>
                  <p className="text-sm text-neutral-400">Ingredients automatically sync across the network when an order is received.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
                  <div className="space-y-3">
                    <div className="bg-[#0A0A0A] border border-emerald-500/20 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                          <Check size={16} className="text-emerald-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-white">Order #1042 Received</div>
                          <div className="text-xs text-neutral-500 truncate">2x Chicken Biryani, 1x Coke</div>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-neutral-500 shrink-0 ml-2">Just Now</span>
                    </div>

                    <div className="w-px h-4 bg-white/[0.06] ml-4" />

                    <div className="bg-[#0A0A0A] border border-white/[0.06] rounded-lg p-4 flex items-center gap-3 opacity-90">
                      <div className="w-8 h-8 rounded-md bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
                        <Database size={16} className="text-neutral-400" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">Looking up Master Recipe</div>
                        <div className="text-xs text-neutral-500">Chicken Biryani (Large)</div>
                      </div>
                    </div>

                    <div className="w-px h-4 bg-white/[0.06] ml-4" />

                    <div className="bg-[#0A0A0A] border border-white/[0.06] rounded-lg p-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-[#FF6B00]/10 border border-[#FF6B00]/20 flex items-center justify-center shrink-0">
                        <Activity size={16} className="text-[#FF6B00]" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">Inventory Impact</div>
                        <div className="text-xs text-neutral-500">Deducting from Central Kitchen</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#0A0A0A] rounded-xl border border-white/[0.06] p-5 sm:p-6">
                    <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-5">Live Deductions</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center pb-4 border-b border-white/[0.06]">
                        <span className="text-sm text-white font-medium">Basmati Rice</span>
                        <div className="text-right">
                          <span className="text-sm text-red-400 font-mono block">-400g</span>
                          <span className="text-xs text-neutral-500 font-mono">14.2kg remaining</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center pb-4 border-b border-white/[0.06]">
                        <span className="text-sm text-white font-medium">Chicken (Raw)</span>
                        <div className="text-right">
                          <span className="text-sm text-red-400 font-mono block">-600g</span>
                          <span className="text-xs text-neutral-500 font-mono">8.4kg remaining</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-white font-medium">Spices Blend</span>
                        <div className="text-right">
                          <span className="text-sm text-red-400 font-mono block">-20g</span>
                          <span className="text-xs text-neutral-500 font-mono">2.1kg remaining</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </m.div>
            )}

            {activeTab === 'customer' && (
              <m.div key="customer" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
                <div className="mb-6 sm:mb-8">
                  <h3 className="text-lg sm:text-xl font-semibold text-white mb-1">Customer Graph</h3>
                  <p className="text-sm text-neutral-400">Track retention and purchase patterns across all connected nodes.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                  <div className="bg-[#0A0A0A] border border-white/[0.06] rounded-lg p-5 md:col-span-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">Customer Profile: Viswa</div>
                      <div className="text-xl sm:text-2xl font-semibold text-white mb-2">High Value / Frequent</div>
                      <div className="text-sm text-neutral-400">Last order: 2 days ago. Favorite: Butter Chicken.</div>
                    </div>
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-emerald-500/60 flex items-center justify-center text-emerald-400 font-bold text-lg shrink-0 self-start sm:self-center">
                      98
                    </div>
                  </div>
                  <div className="bg-[#0A0A0A] border border-amber-500/20 rounded-lg p-5 flex flex-col justify-center">
                    <div className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-2">Churn Risk</div>
                    <div className="text-sm text-neutral-200 font-medium">12 high-value customers haven&apos;t ordered in 30+ days.</div>
                    <button className="mt-4 text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25 px-3 py-1.5 rounded-md w-fit hover:bg-amber-500/15 transition-colors">
                      Create Reactivation Campaign
                    </button>
                  </div>
                </div>
              </m.div>
            )}

            {activeTab === 'health' && (
              <m.div key="health" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6 sm:mb-8">
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-white mb-1">Kitchen Health Monitoring</h3>
                    <p className="text-sm text-neutral-400">Live operational scoring and bottleneck detection.</p>
                  </div>
                  <div className="self-start flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Healthy</span>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="bg-[#0A0A0A] border border-white/[0.06] rounded-lg p-5 sm:p-6">
                    <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-4">Preparation Latency</div>
                    <div className="flex items-end gap-2 mb-2">
                      <span className="text-3xl sm:text-4xl font-bold text-white tabular-nums">12</span>
                      <span className="text-base font-medium text-neutral-400 mb-1">min</span>
                    </div>
                    <p className="text-sm text-neutral-400">Average prep time over the last hour. Operating within SLA.</p>
                  </div>

                  <div className="bg-[#0A0A0A] border border-amber-500/20 rounded-lg p-5 sm:p-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="text-amber-400 shrink-0 mt-0.5" size={18} />
                      <div>
                        <div className="text-sm font-medium text-white mb-1">Packaging Bottleneck Detected</div>
                        <p className="text-sm text-neutral-400 mb-4">Orders are waiting 4.5 minutes on average at the packing station before handover.</p>
                        <div className="text-xs font-medium text-amber-400 bg-amber-500/10 px-3 py-2 rounded-md border border-amber-500/20">
                          Rec: Assign 1 additional staff to packing station for the next 45 minutes.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// --- Main Page Component ---
const OnboardKitchen: React.FC = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#030303] text-white font-sans selection:bg-[#FF6B00]/20 relative">
      <EnterpriseSchema />
      <EnterpriseHeader />

      <main className="flex-grow">
        <section className="pt-28 pb-16 sm:pt-32 sm:pb-20 md:pb-24 px-4 sm:px-6 lg:px-12 max-w-[1200px] mx-auto flex flex-col items-center text-center relative">
          <m.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl mx-auto w-full"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#0A0A0A] border border-white/[0.08] text-[10px] sm:text-xs font-semibold uppercase tracking-[0.18em] mb-6 sm:mb-8 text-neutral-400">
              {homepageHero.eyebrow}
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-bold tracking-tight mb-5 sm:mb-6 leading-[1.08] text-white">
              {homepageHero.headline}
              <br />
              <span className="text-[#FF6B00]">{homepageHero.headlineAccent}</span>
            </h1>

            <p className="text-base sm:text-lg text-neutral-400 font-normal leading-relaxed mb-6 sm:mb-8 max-w-2xl mx-auto px-1">
              {homepageHero.subheadline}
            </p>

            <ul className="text-left max-w-xl mx-auto mb-8 sm:mb-10 space-y-3 text-sm text-neutral-300">
              {[
                'Zero commission on direct orders',
                'No onboarding fee — start free',
                'Your own branded storefront URL',
                'Orders, delivery, payments & kitchen in one place',
                'Smart tips when you need them — not AI hype',
              ].map((bullet) => (
                <li key={bullet} className="flex items-start gap-2">
                  <Check size={16} className="text-[#FF6B00] shrink-0 mt-0.5" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 max-w-md mx-auto w-full">
              <CTAButton to="/owner/register" variant="primary" className="w-full sm:flex-1">
                {homepageHero.primaryCta} <ArrowRight size={16} />
              </CTAButton>
              <CTAButton to="/owner/login" variant="outline" className="w-full sm:flex-1">
                {homepageHero.secondaryCta}
              </CTAButton>
            </div>
            <p className="text-xs text-neutral-500 mt-4">{homepageHero.trustLine}</p>
          </m.div>

          <InteractiveCommandCenter />
        </section>

        <TrustSection variant="strip" />

        <RestaurantProblems />
        <MissionVision />
        <ProductOverview />
        <WhyChooseBhojanOS />
        <ExecutiveLeadership />
        <FounderStory />
        <TrustSection variant="full" />
        <TechnologyStack />
        <CallToAction />
      </main>

      <EnterpriseFooter />
    </div>
  );
};

export default OnboardKitchen;
