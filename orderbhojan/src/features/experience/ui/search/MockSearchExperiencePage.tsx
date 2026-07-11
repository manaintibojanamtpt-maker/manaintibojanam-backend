import { Link, useNavigate } from 'react-router-dom';
import { MarketplaceSearchBar } from '@bhojan/storefront-design-system/marketplace/MarketplaceSearchBar';
import { Section } from '@bhojan/storefront-design-system/primitives/Section';
import { SectionHeader } from '@bhojan/storefront-design-system/primitives/SectionHeader';
import { CategorySkeleton } from '@bhojan/storefront-design-system/skeleton/SkeletonSystem';
import {
  POPULAR_SEARCHES,
  RECENT_SEARCHES,
  TRENDING_FOODS,
} from '../../data/mockCatalog';

const chipClass =
  'rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:border-[#FF7A00]/40 hover:text-white';

export function MockSearchExperiencePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#030303] text-white">
      <Section density="hero" background="gradient">
        <SectionHeader title="Search" align="left" className="!text-left" />
        <div className="pointer-events-none opacity-80">
          <MarketplaceSearchBar
            value=""
            onChange={() => undefined}
            onSubmit={() => navigate('/search')}
            onClear={() => undefined}
          />
        </div>
      </Section>

      <main className="mx-auto max-w-5xl space-y-2 px-4 pb-16 sm:px-6 lg:px-8">
        <Section density="comfortable" background="default" className="!py-6">
          <SectionHeader title="Recent searches" align="left" className="!mb-4 !text-left" />
          <div className="flex flex-wrap gap-2">
            {RECENT_SEARCHES.map((term) => (
              <span key={term.id} className={chipClass}>
                {term.label}
              </span>
            ))}
          </div>
        </Section>

        <Section density="comfortable" background="subtle" className="!py-6">
          <SectionHeader title="Popular searches" align="left" className="!mb-4 !text-left" />
          <div className="flex flex-wrap gap-2">
            {POPULAR_SEARCHES.map((term) => (
              <span key={term.id} className={chipClass}>
                {term.label}
              </span>
            ))}
          </div>
        </Section>

        <Section density="comfortable" background="default" className="!py-6">
          <SectionHeader title="Trending foods" align="left" className="!mb-4 !text-left" />
          <CategorySkeleton />
          <div className="mt-4 space-y-3">
            {TRENDING_FOODS.map((food) => (
              <Link
                key={food.id}
                to={`/restaurant/${food.restaurantSlug}`}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-[#FF7A00]/40"
              >
                <div className="h-12 w-12 rounded-xl bg-white/5" />
                <div>
                  <p className="text-sm font-semibold text-white">{food.name}</p>
                  <p className="text-xs text-white/50">{food.restaurantSlug}</p>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      </main>
    </div>
  );
}
