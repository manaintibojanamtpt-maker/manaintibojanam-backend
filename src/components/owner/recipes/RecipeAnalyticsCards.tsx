import React from 'react';
import { m } from 'framer-motion';
import type { RecipeIntelligenceSummary } from '../../types';

type Props = {
  summary: RecipeIntelligenceSummary | null;
  loading?: boolean;
};

function SkeletonCard() {
  return <div className="h-24 rounded-2xl bg-white/5 animate-pulse border border-white/5" />;
}

export function RecipeAnalyticsCards({ summary, loading }: Props) {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const cards = [
    { label: 'Recipe Coverage', value: `${summary.recipeCoveragePercent}%` },
    { label: 'Total Ingredients', value: String(summary.totalIngredients) },
    { label: 'Avg Recipe Cost', value: `₹${summary.averageRecipeCost}` },
    { label: 'Highest Margin', value: `${summary.highestMarginPercent}%` },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {cards.map((card, index) => (
        <m.div
          key={card.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="rounded-2xl border border-white/10 bg-black/30 p-4"
        >
          <p className="text-xs font-bold uppercase tracking-wider text-white/50">{card.label}</p>
          <p className="text-2xl font-black text-white mt-1">{card.value}</p>
        </m.div>
      ))}
    </div>
  );
}
