import React, { memo } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Section } from '../ui/Section';
import { SectionHeader } from '../ui/SectionHeader';
import { FoodImage } from '../ui/FoodImage';
import { getMarketingFoodImage } from '../../config/marketingFoodImages';
import { orderBhojanPublic } from '../../config/demoData';

interface Dish {
  name: string;
  desc: string;
  restaurant: string;
  tag: string;
}

/**
 * OrderBhojan customer-facing food discovery — illustrative preview.
 * Prices are intentionally omitted unless verified from real project data,
 * so this never fabricates menu pricing. Images are generic food photography
 * (not any real restaurant's dishes).
 */
const DISHES: Dish[] = [
  {
    name: 'Chicken Biryani',
    desc: 'Slow-cooked dum biryani with saffron rice and raita',
    restaurant: 'Independent kitchen',
    tag: 'Popular',
  },
  {
    name: 'Masala Dosa',
    desc: 'Crisp golden dosa with spiced potato masala',
    restaurant: 'Independent kitchen',
    tag: 'Breakfast',
  },
  {
    name: 'Paneer Butter Masala',
    desc: 'Rich tomato-cashew gravy with soft paneer',
    restaurant: 'Independent kitchen',
    tag: 'Bestseller',
  },
];

export const FoodDiscoverySection = memo(function FoodDiscoverySection() {
  return (
    <Section id="customers" background="subtle" className="scroll-mt-24 overflow-hidden">
      <div
        className="pointer-events-none absolute top-1/2 right-[-10%] w-[420px] h-[420px] rounded-full bg-[#FF7A00]/[0.05] blur-[120px]"
        aria-hidden
      />
      <SectionHeader
        label="OrderBhojan — For customers"
        title="Discover food worth ordering."
        description="OrderBhojan is the customer ordering experience powered by BhojanOS. Discover local food businesses, browse their menus, and order directly — your order flows straight into the restaurant's BhojanOS."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 max-w-5xl mx-auto">
        {DISHES.map((dish) => {
          const foodImage = getMarketingFoodImage(dish.name);
          return (
            <div
              key={dish.name}
              className="group relative flex flex-col overflow-hidden rounded-[1.5rem] border border-white/[0.06] bg-[#0A0A0A]/80 transition-all duration-300 hover:border-[#FF7A00]/25 hover:-translate-y-1.5 hover:shadow-[0_32px_64px_-20px_rgba(0,0,0,0.7)]"
            >
              <FoodImage
                src={foodImage?.url}
                alt={foodImage?.alt ?? dish.name}
                ratio="video"
                zoomOnHover
                className="rounded-none !h-auto"
              />
              <div className="flex flex-col flex-1 gap-2 p-5 sm:p-6">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display text-lg sm:text-xl font-bold text-white tracking-tight">
                      {dish.name}
                    </h3>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#FF7A00]/80 mt-0.5">
                      {dish.tag}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#FF7A00]/20 bg-[#FF7A00]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#FF7A00] shrink-0">
                    <Sparkles size={9} aria-hidden />
                    BhojanOS
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">{dish.desc}</p>
                <p className="text-[11px] text-neutral-600">From an {dish.restaurant}</p>

                <div className="mt-auto pt-2">
                  <a
                    href={orderBhojanPublic.homeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-[#FF7A00] hover:text-[#ff9533] transition-colors"
                  >
                    Order on OrderBhojan
                    <ArrowRight size={15} aria-hidden />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-10 text-center">
        <a
          href={orderBhojanPublic.homeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-[#FF7A00] px-6 py-3 text-sm font-bold text-white hover:bg-[#E56D00] transition-colors shadow-[0_8px_28px_-8px_rgba(255,122,0,0.5)]"
        >
          Explore OrderBhojan →
        </a>
      </div>
    </Section>
  );
});

export default FoodDiscoverySection;