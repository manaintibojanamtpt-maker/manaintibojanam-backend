import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Section } from '@bhojan/storefront-design-system/primitives/Section';
import { SectionHeader } from '@bhojan/storefront-design-system/primitives/SectionHeader';
import { useHeroPreload } from '@/features/experience/hooks/useHeroPreload';
import type { FoodPublic } from '@/types/marketplace-food';
import { resolveFoodItemPhoto } from '@/features/food/data/food-item-photo-manifest';
import { groupItemsByCategory } from '@/features/food/domain/formatters';
import { hasBestsellerLabel } from '@/features/food/domain/contractPresentation';
import { useCategoryScrollSpy } from '@/features/food/hooks/useCategoryScrollSpy';
import { useFoodMenu } from '@/features/food/hooks/useFoodMenu';
import { useTenantRevisionSync } from '@/features/marketplace/hooks/useTenantRevisionSync';
import { OrderBhojanFoodCustomizeSheet as FoodCustomizeSheet } from './OrderBhojanFoodCustomizeSheet';
import {
  OrderBhojanDiscoveryOfflineNotice,
  OrderBhojanMenuEmptyState,
  OrderBhojanMenuErrorState,
  OrderBhojanRestaurantUxShell,
  useOnlineStatus,
} from '@/presentation/states';
import { OrderBhojanFoodCategoryRail } from './OrderBhojanFoodCategoryRail';
import { OrderBhojanFoodFeaturedCard } from './OrderBhojanFoodFeaturedCard';
import { OrderBhojanFoodFloatingCart } from './OrderBhojanFoodFloatingCart';
import { OrderBhojanFoodMenuSection } from './OrderBhojanFoodMenuSection';
import { OrderBhojanFoodMenuSkeleton } from './OrderBhojanFoodMenuSkeleton';
import { OrderBhojanFoodRestaurantStrip } from './OrderBhojanFoodRestaurantStrip';

function OrderBhojanFoodContent({ restaurantSlug }: { readonly restaurantSlug: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const online = useOnlineStatus();
  const query = useFoodMenu(restaurantSlug);
  const [customizeFood, setCustomizeFood] = useState<FoodPublic | null>(null);
  const enterFromRestaurant = Boolean(
    (location.state as { fromRestaurant?: boolean } | null)?.fromRestaurant,
  );

  const menu = query.data;
  const restaurantName = menu?.restaurantName ?? 'Menu';
  const items = useMemo(() => menu?.items ?? [], [menu?.items]);
  const categories = useMemo(() => menu?.categories ?? [], [menu?.categories]);

  const sectionIds = useMemo(
    () => categories.map((category) => `food-cat-${category.id}`),
    [categories],
  );
  const { activeId, scrollTo } = useCategoryScrollSpy(sectionIds);

  const byCategory = useMemo(() => groupItemsByCategory(items), [items]);
  const itemMap = useMemo(() => new Map(items.map((item) => [item.foodId, item])), [items]);

  const signatureItems = useMemo(() => {
    const featured = (menu?.featuredIds ?? [])
      .map((id) => itemMap.get(id))
      .filter((item): item is FoodPublic => Boolean(item));
    const bestsellers = items.filter((item) => hasBestsellerLabel(item));
    const seen = new Set<string>();
    const merged: FoodPublic[] = [];
    for (const item of [...featured, ...bestsellers]) {
      if (seen.has(item.foodId)) continue;
      seen.add(item.foodId);
      merged.push(item);
    }
    return merged.slice(0, 6);
  }, [menu?.featuredIds, itemMap, items]);

  const heroFood = signatureItems[0];
  const heroPhoto = heroFood ? resolveFoodItemPhoto(heroFood.foodId, 960, '100vw', 88) : null;
  useHeroPreload(heroPhoto?.preloadHref ?? '', heroPhoto?.srcSet);

  if (query.isLoading) return <OrderBhojanFoodMenuSkeleton />;

  if (query.isError || !menu) {
    return (
      <OrderBhojanRestaurantUxShell>
        {!online ? <OrderBhojanDiscoveryOfflineNotice onRetry={() => void query.refetch()} /> : null}
        <OrderBhojanMenuErrorState offline={!online} onRetry={() => void query.refetch()} />
      </OrderBhojanRestaurantUxShell>
    );
  }

  if (items.length === 0) {
    return (
      <OrderBhojanRestaurantUxShell>
        <OrderBhojanMenuEmptyState onBack={() => navigate(`/restaurant/${restaurantSlug}`)} />
      </OrderBhojanRestaurantUxShell>
    );
  }

  return (
    <div className={`min-h-screen bg-[#030303] text-white${enterFromRestaurant ? ' opacity-0 animate-[fadeIn_0.4s_ease_forwards]' : ''}`}>
      <OrderBhojanFoodRestaurantStrip
        slug={restaurantSlug}
        name={restaurantName}
        onBack={() => navigate(`/restaurant/${restaurantSlug}`)}
        onHome={() => navigate('/')}
      />

      <OrderBhojanFoodCategoryRail categories={categories} activeId={activeId} onSelect={scrollTo} />

      {signatureItems.length > 0 ? (
        <Section density="comfortable" background="subtle" className="!py-6" aria-label="Signature dishes">
          <div className="mx-auto max-w-3xl px-4">
            <SectionHeader title="Signature dishes" align="left" className="!mb-4 !text-left" />
            <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
              {signatureItems.map((food, index) => (
                <OrderBhojanFoodFeaturedCard
                  key={food.foodId}
                  food={food}
                  onCustomize={setCustomizeFood}
                  priority={index === 0}
                />
              ))}
            </div>
          </div>
        </Section>
      ) : null}

      {categories.map((category) => (
        <OrderBhojanFoodMenuSection
          key={category.id}
          id={`food-cat-${category.id}`}
          title={category.name}
          items={byCategory.get(category.id) ?? []}
          onCustomize={setCustomizeFood}
        />
      ))}

      <div className="h-28" aria-hidden />

      <OrderBhojanFoodFloatingCart />

      <FoodCustomizeSheet
        food={customizeFood}
        open={customizeFood != null}
        onClose={() => setCustomizeFood(null)}
      />
    </div>
  );
}

export function OrderBhojanFoodExperience() {
  const { restaurantSlug } = useParams<{ restaurantSlug: string }>();
  useTenantRevisionSync(restaurantSlug);
  return <OrderBhojanFoodContent restaurantSlug={restaurantSlug ?? ''} />;
}
