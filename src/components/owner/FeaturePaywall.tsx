import React from 'react';
import { Lock, ArrowRight, Zap, TrendingUp, Package, Box, Lightbulb } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FeaturePaywallProps {
  featureKey: string;
}

const FEATURE_META: Record<string, { title: string; desc: string; icon: any; minPlan: string }> = {
  inventory: {
    title: 'Advanced Inventory',
    desc: 'Track stock, set low-stock alerts, and automate prep lists to reduce waste.',
    icon: Box,
    minPlan: 'Growth',
  },
  predictiveSupply: {
    title: 'AI Recipe & Supply',
    desc: 'Use AI to generate recipes, scale ingredients, and predict weekend demand.',
    icon: Lightbulb,
    minPlan: 'Pro',
  },
  marketingTools: {
    title: 'Growth Campaigns',
    desc: 'Send automated WhatsApp campaigns to win back dormant customers.',
    icon: TrendingUp,
    minPlan: 'Growth',
  },
  deliveryEngine: {
    title: 'Delivery Intelligence',
    desc: 'Optimize delivery zones, track fleet performance, and route orders dynamically.',
    icon: Zap,
    minPlan: 'Pro',
  },
};

export const FeaturePaywall: React.FC<FeaturePaywallProps> = ({ featureKey }) => {
  const meta = FEATURE_META[featureKey] || {
    title: 'Premium Feature',
    desc: 'This feature is only available on advanced plans. Upgrade to unlock.',
    icon: Lock,
    minPlan: 'Growth',
  };

  const Icon = meta.icon;

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 relative">
        <Icon className="w-8 h-8 text-white/40" />
        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[#111] border border-white/10 flex items-center justify-center shadow-xl">
          <Lock className="w-4 h-4 text-amber-400" />
        </div>
      </div>
      
      <h2 className="text-2xl font-semibold tracking-tight text-white mb-3">
        {meta.title}
      </h2>
      
      <p className="text-white/60 max-w-md text-base leading-relaxed mb-8">
        {meta.desc}
      </p>

      <div className="bg-white/5 rounded-xl border border-white/10 p-5 mb-8 max-w-md w-full text-left flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white mb-1">Requires {meta.minPlan} Plan</p>
          <p className="text-xs text-white/50">Zero commission on orders remains unchanged.</p>
        </div>
        <Link 
          to="/owner/subscription"
          className="shrink-0 bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/90 transition-colors flex items-center gap-1.5"
        >
          Upgrade
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
