import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Lock, Sparkles } from 'lucide-react';
import { orderBhojanPublic } from '../config/demoData';
import { Button } from './ui/button';

export function CallToAction() {
  const navigate = useNavigate();
  const [restaurantName, setRestaurantName] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = new URLSearchParams();
    if (restaurantName) query.set('name', restaurantName);
    if (phone) query.set('phone', phone);
    navigate(`/owner/register?${query.toString()}`);
  };

  return (
    <section 
      id="trial" 
      className="py-20 sm:py-24 bg-[#09090B] border-b border-[#27272A] text-[#FAFAFA] relative overflow-hidden" 
      aria-labelledby="cta-heading"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.15] shadow-none mb-4">
          <span className="text-xs font-mono font-semibold text-[#D97706] uppercase tracking-wider">
            Immediate Onboarding
          </span>
        </div>

        {/* Headline */}
        <h2 
          id="cta-heading"
          className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#FAFAFA] leading-tight pb-2 pt-1 overflow-visible"
        >
          Ready to stop paying the aggregator tax? Launch your direct kitchen in under 15 minutes.
        </h2>

        {/* Subtitle */}
        <p className="mt-4 text-base sm:text-lg text-[#A1A1AA] max-w-2xl mx-auto leading-relaxed">
          No credit card required. Build and preview your branded storefront for free. When you are ready to publish, your 14-day Growth trial starts automatically.
        </p>

        {/* High-Conversion Fast Onboarding Node */}
        <form 
          onSubmit={handleSubmit}
          className="mt-8 max-w-2xl mx-auto flex flex-col sm:flex-row gap-2.5 p-2 rounded-2xl sm:rounded-full bg-[#18181B] border border-[#27272A] shadow-sm items-center"
        >
          <input
            type="text"
            value={restaurantName}
            onChange={(e) => setRestaurantName(e.target.value)}
            placeholder="Restaurant Name (e.g. Amber Biryani)"
            required
            className="flex-1 px-5 py-3 rounded-full border-0 bg-transparent text-sm text-[#FAFAFA] placeholder:text-[#71717A] focus:outline-none focus:ring-0 w-full"
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 Phone number"
            required
            className="w-full sm:w-44 px-4 py-3 rounded-full border-0 sm:border-l border-[#27272A] bg-transparent text-sm text-[#FAFAFA] placeholder:text-[#71717A] font-mono focus:outline-none focus:ring-0"
          />
          <Button
            type="primary"
            shape="rounded"
            size="medium"
            shadow
            suffix={<ArrowRight size={14} aria-hidden />}
            className="w-full sm:w-auto shrink-0"
          >
            Claim Free Storefront
          </Button>
        </form>

        {/* Trust Badges Under Form */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-[#A1A1AA]">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-[#10B981]" />
            NPCI UPI 2.0 Compliant
          </span>
          <span className="flex items-center gap-1.5">
            <Lock size={14} className="text-[#10B981]" />
            Razorpay Route Direct Settlement
          </span>
          <span className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-[#D97706]" />
            0% Commission Forever
          </span>
        </div>

        {/* Customer ordering demo link */}
        <div className="mt-8">
          <a
            href={orderBhojanPublic.homeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
          >
            Looking to order delicious home food instead? Visit OrderBhojan.com &rarr;
          </a>
        </div>

      </div>
    </section>
  );
}

export default CallToAction;
