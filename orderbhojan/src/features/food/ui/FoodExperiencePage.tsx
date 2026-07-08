import {
  Button,
  Rail,
  Skeleton,
  Text,
} from '@bhojan/design-system';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { MotionPage, MotionReveal } from '@bhojan/design-system';
import { useHeroPreload } from '@/features/experience/hooks/useHeroPreload';
import type { FoodPublic } from '@/types/marketplace-food';
import { resolveFoodItemPhoto } from '../data/food-item-photo-manifest';
import { groupItemsByCategory } from '../domain/formatters';
import { hasBestsellerLabel } from '../domain/contractPresentation';
import { useCategoryScrollSpy } from '../hooks/useCategoryScrollSpy';
import { useFoodMenu } from '../hooks/useFoodMenu';
import { useTenantRevisionSync } from '@/features/marketplace/hooks/useTenantRevisionSync';
import { FoodCardItem } from './FoodCardItem';
import { FoodCategoryRail } from './FoodCategoryRail';
import { FoodCustomizeSheet } from './FoodCustomizeSheet';
import { FoodFeaturedPoster } from './FoodFeaturedPoster';
import { FoodFloatingPreview } from './FoodFloatingPreview';
import { FoodRestaurantStrip } from './FoodRestaurantStrip';

function FoodExperienceSkeleton() {
  return (
    <div className="ob-food-page ob-food-px6 ob-food-page--loading ob-menu-px2" aria-busy="true">
      <Skeleton height="3.5rem" />
      <Skeleton height="2.5rem" />
      <Skeleton height="14rem" />
      <div className="ob-food-px6__list">
        <Skeleton height="8.5rem" />
        <Skeleton height="8.5rem" />
        <Skeleton height="8.5rem" />
      </div>
    </div>
  );
}

function FoodSection({
  id,
  title,
  items,
  onCustomize,
}: {
  readonly id: string;
  readonly title: string;
  readonly items: readonly FoodPublic[];
  readonly onCustomize: (food: FoodPublic) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section id={id} className="ob-food-section ob-food-px6__section" aria-labelledby={`${id}-title`}>
      <MotionReveal>
        <Text variant="subtitle" as="h2" id={`${id}-title`} className="ob-food-section__title">
          {title}
        </Text>
        <div className="ob-food-px6__list">
          {items.map((food) => (
            <FoodCardItem key={food.foodId} food={food} onCustomize={onCustomize} />
          ))}
        </div>
      </MotionReveal>
    </section>
  );
}

function SignatureDishesRail({
  items,
  onCustomize,
}: {
  readonly items: readonly FoodPublic[];
  readonly onCustomize: (food: FoodPublic) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section className="ob-food-px6__signatures" aria-label="Signature dishes">
      <Text variant="subtitle" as="h2" className="ob-food-section__title">
        Signature dishes
      </Text>
      <Rail aria-label="Signature dishes" className="ob-food-px6__signature-rail">
        {items.map((food, index) => (
          <FoodFeaturedPoster
            key={food.foodId}
            food={food}
            onCustomize={onCustomize}
            priority={index === 0}
          />
        ))}
      </Rail>
    </section>
  );
}

function FoodExperienceContent({ restaurantSlug }: { readonly restaurantSlug: string }) {
  const navigate = useNavigate();
  const location = useLocation();
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

  if (query.isLoading) return <FoodExperienceSkeleton />;

  if (query.isError || !menu) {
    return (
      <section className="ob-food-page ob-food-px6 ob-food-page--error" role="alert">
        <Text variant="subtitle" as="h1">
          Menu unavailable
        </Text>
        <Text variant="body" style={{ color: 'var(--bds-color-text-secondary)' }}>
          We could not load this menu. Check your connection and try again.
        </Text>
        <Button variant="primary" onClick={() => void query.refetch()}>
          Retry
        </Button>
      </section>
    );
  }

  return (
    <MotionPage
      className={`ob-food-page ob-food-px6 ob-menu-px2${enterFromRestaurant ? ' ob-food-px6--enter' : ''}`}
    >
      <FoodRestaurantStrip
        slug={restaurantSlug}
        name={restaurantName}
        onBack={() => navigate(`/restaurant/${restaurantSlug}`)}
        onHome={() => navigate('/')}
      />

      <FoodCategoryRail categories={categories} activeId={activeId} onSelect={scrollTo} />

      <SignatureDishesRail items={signatureItems} onCustomize={setCustomizeFood} />

      {categories.map((category) => (
        <FoodSection
          key={category.id}
          id={`food-cat-${category.id}`}
          title={category.name}
          items={byCategory.get(category.id) ?? []}
          onCustomize={setCustomizeFood}
        />
      ))}

      <div className="ob-food-page__sticky-spacer" aria-hidden />

      <FoodFloatingPreview />

      <FoodCustomizeSheet
        food={customizeFood}
        open={customizeFood != null}
        onClose={() => setCustomizeFood(null)}
      />
    </MotionPage>
  );
}

export function FoodExperiencePage() {
  const { restaurantSlug } = useParams<{ restaurantSlug: string }>();
  useTenantRevisionSync(restaurantSlug);

  return <FoodExperienceContent restaurantSlug={restaurantSlug ?? ''} />;
}
