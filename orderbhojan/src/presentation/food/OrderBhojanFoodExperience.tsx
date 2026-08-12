import { useMemo, useState, useEffect } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { SectionHeader } from '@bhojan/storefront-design-system/primitives/SectionHeader';
import type { FoodPublic } from '@/types/marketplace-food';
import {
  filterMenuItemsByDietary,
  groupItemsByCategory,
  isNonVegFood,
  isVegFood,
  matchesMenuDietaryFilter,
  type MenuDietaryFilter,
} from '@/features/food/domain/formatters';
import { hasBestsellerLabel } from '@/features/food/domain/contractPresentation';
import { useCategoryScrollSpy } from '@/features/food/hooks/useCategoryScrollSpy';
import { useFoodMenu } from '@/features/food/hooks/useFoodMenu';
import { useTenantRevisionSync } from '@/features/marketplace/hooks/useTenantRevisionSync';
import { useRestaurantExperience } from '@/features/restaurant/hooks/useRestaurantExperience';

import { OrderBhojanFoodCustomizeSheet as FoodCustomizeSheet } from './OrderBhojanFoodCustomizeSheet';
import {
  OrderBhojanDiscoveryOfflineNotice,
  OrderBhojanMenuEmptyState,
  OrderBhojanMenuErrorState,
  OrderBhojanRestaurantUxShell,
  useOnlineStatus,
} from '@/presentation/states';
import { OrderBhojanFoodCategoryRail } from './OrderBhojanFoodCategoryRail';
import { OrderBhojanFoodDietaryFilterBar } from './OrderBhojanFoodDietaryFilterBar';
import { OrderBhojanFoodFeaturedCard } from './OrderBhojanFoodFeaturedCard';
import { OrderBhojanFoodFloatingCart } from './OrderBhojanFoodFloatingCart';
import { OrderBhojanFoodMenuSection } from './OrderBhojanFoodMenuSection';
import { OrderBhojanFoodRestaurantStrip } from './OrderBhojanFoodRestaurantStrip';
import { MenuItemSkeleton } from '@bhojan/storefront-design-system/skeleton/SkeletonSystem';

function OrderBhojanFoodContent({ restaurantSlug }: { readonly restaurantSlug: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const online = useOnlineStatus();
  const query = useFoodMenu(restaurantSlug);
  const navKitchenName = (location.state as { kitchenName?: string } | null)?.kitchenName;
  const [customizeFood, setCustomizeFood] = useState<FoodPublic | null>(null);
  const [dietaryFilter, setDietaryFilter] = useState<MenuDietaryFilter>('all');
  const enterFromRestaurant = Boolean(
    (location.state as { fromRestaurant?: boolean } | null)?.fromRestaurant,
  );

  const menu = query.data;
  const restaurantName = menu?.restaurantName ?? 'Menu';
  const items = useMemo(() => menu?.items ?? [], [menu?.items]);
  const categories = useMemo(() => menu?.categories ?? [], [menu?.categories]);

  const dietaryCounts = useMemo(
    () => ({
      veg: items.filter(isVegFood).length,
      nonVeg: items.filter(isNonVegFood).length,
    }),
    [items],
  );

  const filteredItems = useMemo(
    () => filterMenuItemsByDietary(items, dietaryFilter),
    [dietaryFilter, items],
  );

  useEffect(() => {
    if (dietaryFilter === 'veg' && dietaryCounts.veg === 0) {
      setDietaryFilter('all');
    } else if (dietaryFilter === 'nonVeg' && dietaryCounts.nonVeg === 0) {
      setDietaryFilter('all');
    }
  }, [dietaryCounts.nonVeg, dietaryCounts.veg, dietaryFilter]);

  const visibleCategories = useMemo(() => {
    const grouped = groupItemsByCategory(filteredItems);
    return categories.filter((category) => (grouped.get(category.id)?.length ?? 0) > 0);
  }, [categories, filteredItems]);

  const sectionIds = useMemo(
    () => visibleCategories.map((category) => `food-cat-${category.id}`),
    [visibleCategories],
  );
  const { activeId, scrollTo } = useCategoryScrollSpy(sectionIds);

  const byCategory = useMemo(() => groupItemsByCategory(filteredItems), [filteredItems]);
  const itemMap = useMemo(() => new Map(items.map((item) => [item.foodId, item])), [items]);

  const signatureItems = useMemo(() => {
    const featured = (menu?.featuredIds ?? [])
      .map((id) => itemMap.get(id))
      .filter((item): item is FoodPublic => Boolean(item));
    const bestsellers = filteredItems.filter((item) => hasBestsellerLabel(item));
    const seen = new Set<string>();
    const merged: FoodPublic[] = [];
    for (const item of [...featured, ...bestsellers]) {
      if (!matchesMenuDietaryFilter(item, dietaryFilter)) continue;
      if (seen.has(item.foodId)) continue;
      seen.add(item.foodId);
      merged.push(item);
    }
    return merged.slice(0, 6);
  }, [dietaryFilter, filteredItems, itemMap, menu?.featuredIds]);

  const restaurantQuery = useRestaurantExperience(restaurantSlug);
  const restaurantData = restaurantQuery.data;
  const shellName =
    restaurantData?.experience.displayName ?? navKitchenName ?? restaurantName ?? 'Menu';

  // Prefer chrome + item shimmer over a blank full-page skeleton (native feel).
  if (query.isPending && !menu) {
    return (
      <div className="ob-menu-page min-h-screen bg-[#030303] text-white">
        <OrderBhojanFoodRestaurantStrip
          slug={restaurantSlug}
          name={shellName}
          onBack={() => navigate(`/restaurant/${restaurantSlug}`)}
          onHome={() => navigate('/')}
        />
        <div className="ob-menu-sticky-chrome sticky top-0 z-30 border-b border-white/10 bg-[#030303]/95 backdrop-blur-md px-4 py-3">
          <div className="mb-3 flex gap-2 overflow-hidden">
            <div className="h-9 w-24 shrink-0 animate-pulse rounded-full bg-white/10" />
            <div className="h-9 w-28 shrink-0 animate-pulse rounded-full bg-white/10" />
            <div className="h-9 w-20 shrink-0 animate-pulse rounded-full bg-white/10" />
          </div>
        </div>
        <div className="flex flex-col" aria-busy="true" aria-label="Loading menu">
          <MenuItemSkeleton />
          <MenuItemSkeleton />
          <MenuItemSkeleton />
          <MenuItemSkeleton />
        </div>
      </div>
    );
  }

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
    <div
      className={`ob-menu-page min-h-screen bg-[#030303] text-white${enterFromRestaurant ? ' ob-menu-enter' : ''}`}
    >
      <OrderBhojanFoodRestaurantStrip
        slug={restaurantSlug}
        name={restaurantData?.experience.displayName ?? restaurantName}
        onBack={() => navigate(`/restaurant/${restaurantSlug}`)}
        onHome={() => navigate('/')}
      />

      <div className="ob-menu-sticky-chrome sticky top-0 z-30 border-b border-white/10 bg-[#030303]/95 backdrop-blur-md">
        <OrderBhojanFoodDietaryFilterBar
          value={dietaryFilter}
          onChange={setDietaryFilter}
          vegCount={dietaryCounts.veg}
          nonVegCount={dietaryCounts.nonVeg}
        />
        <OrderBhojanFoodCategoryRail
          categories={visibleCategories}
          activeId={activeId}
          onSelect={scrollTo}
          embedded
        />
      </div>

      {filteredItems.length === 0 ? (
        <section className="ob-menu-section w-full min-w-0 bg-[#030303] py-10">
          <div className="ob-menu-container flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#e85d04]/25 bg-[#e85d04]/10">
              <UtensilsCrossed className="h-5 w-5 text-[#f4a261]" aria-hidden />
            </div>
            <p className="mt-3 text-base font-bold text-white">No dishes match this filter</p>
            <p className="mt-1.5 text-sm text-white/60">Try All or switch between Veg and Non-Veg.</p>
            <button
              type="button"
              className="mt-4 rounded-full border border-[#e85d04]/40 px-5 py-2.5 text-sm font-bold text-[#e85d04] transition hover:bg-[#e85d04]/10 touch-manipulation"
              onClick={() => setDietaryFilter('all')}
            >
              Show all dishes
            </button>
          </div>
        </section>
      ) : null}

      {filteredItems.length > 0 && signatureItems.length > 0 ? (
        <section className="ob-menu-section w-full min-w-0 bg-[#0A0A0A] py-6" aria-label="Signature dishes">
          <div className="ob-menu-container">
            <SectionHeader title="Signature dishes" align="left" className="!mb-4 !text-left" />
            <div className="ob-menu-rail-bleed">
              <div className="ob-menu-rail-scroll flex gap-4 pb-2 no-scrollbar">
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
          </div>
        </section>
      ) : null}

      {filteredItems.length > 0
        ? visibleCategories.map((category) => (
            <OrderBhojanFoodMenuSection
              key={category.id}
              id={`food-cat-${category.id}`}
              title={category.name}
              items={byCategory.get(category.id) ?? []}
              onCustomize={setCustomizeFood}
            />
          ))
        : null}

      <div className="ob-menu-cart-spacer" aria-hidden />

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
