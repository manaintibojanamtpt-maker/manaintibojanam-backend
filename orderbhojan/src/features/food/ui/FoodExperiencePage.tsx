import {
  Button,
  Card,
  Icon,
  Rail,
  Skeleton,
  Text,
} from '@bhojan/design-system';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useScrollChrome } from '@/features/experience/hooks/useScrollChrome';
import { MotionPage, MotionReveal } from '@/features/experience/motion/premiumMotion';
import type { FoodPublic } from '@/types/marketplace-food';
import { groupItemsByCategory } from '../domain/formatters';
import { useCategoryScrollSpy } from '../hooks/useCategoryScrollSpy';
import { useFoodMenu } from '../hooks/useFoodMenu';
import { FoodCardItem } from './FoodCardItem';
import { FoodCategoryRail } from './FoodCategoryRail';
import { FoodCustomizeSheet } from './FoodCustomizeSheet';
import { FoodFloatingPreview } from './FoodFloatingPreview';

function FoodExperienceSkeleton() {
  return (
    <div className="ob-food-page ob-food-page--loading ob-m65-menu ob-m65-skeleton" aria-busy="true">
      <Skeleton height="3rem" />
      <Skeleton height="2.5rem" />
      <div className="ob-food-page__grid">
        <Skeleton height="18rem" />
        <Skeleton height="18rem" />
        <Skeleton height="18rem" />
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
    <section id={id} className="ob-food-section" aria-labelledby={`${id}-title`}>
      <MotionReveal>
        <Text variant="subtitle" as="h2" id={`${id}-title`} className="ob-food-section__title">
          {title}
        </Text>
        <div className="ob-food-page__grid">
          {items.map((food) => (
            <FoodCardItem key={food.foodId} food={food} onCustomize={onCustomize} />
          ))}
        </div>
      </MotionReveal>
    </section>
  );
}

function FeaturedRail({
  title,
  items,
  onCustomize,
}: {
  readonly title: string;
  readonly items: readonly FoodPublic[];
  readonly onCustomize: (food: FoodPublic) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section className="ob-food-section" aria-label={title}>
      <Text variant="subtitle" as="h2" className="ob-food-section__title">
        {title}
      </Text>
      <Rail aria-label={title}>
        {items.map((food) => (
          <div key={food.foodId} className="ob-food-rail-card">
            <FoodCardItem food={food} onCustomize={onCustomize} />
          </div>
        ))}
      </Rail>
    </section>
  );
}

function FoodExperienceContent({ restaurantSlug }: { readonly restaurantSlug: string }) {
  const navigate = useNavigate();
  const query = useFoodMenu(restaurantSlug);
  const scrolled = useScrollChrome();
  const [customizeFood, setCustomizeFood] = useState<FoodPublic | null>(null);

  const menu = query.data;
  const restaurantName = menu?.restaurantName;
  const items = useMemo(() => menu?.items ?? [], [menu?.items]);
  const categories = useMemo(() => menu?.categories ?? [], [menu?.categories]);

  const sectionIds = useMemo(
    () => categories.map((category) => `food-cat-${category.id}`),
    [categories],
  );
  const { activeId, scrollTo } = useCategoryScrollSpy(sectionIds);

  const byCategory = useMemo(() => groupItemsByCategory(items), [items]);
  const itemMap = useMemo(() => new Map(items.map((item) => [item.foodId, item])), [items]);

  const featured = (menu?.featuredIds ?? [])
    .map((id) => itemMap.get(id))
    .filter((item): item is FoodPublic => Boolean(item));
  const todaysSpecials = (menu?.todaysSpecialIds ?? [])
    .map((id) => itemMap.get(id))
    .filter((item): item is FoodPublic => Boolean(item));
  const recommended = items.filter((item) => item.recommended);
  const bestsellers = items.filter((item) => item.bestSeller);
  const chefSpecials = items.filter((item) => item.chefSpecial);

  if (query.isLoading) return <FoodExperienceSkeleton />;

  if (query.isError || !menu) {
    return (
      <section className="ob-food-page ob-food-page--error" role="alert">
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
    <MotionPage className="ob-food-page ob-m65-menu">
      <header className={`ob-food-page__header${scrolled ? ' ob-food-page__header--collapsed' : ''}`}>
        <Button
          variant="secondary"
          size="compact"
          className="ob-food-page__back"
          aria-label="Back to restaurant"
          onClick={() => navigate(`/restaurant/${restaurantSlug}`)}
        >
          <Icon size={18} label="Back">
            <path d="M15 18l-6-6 6-6" />
          </Icon>
        </Button>
        <Text variant="subtitle" as="p" className="ob-food-page__header-title">
          {restaurantName ?? 'Menu'}
        </Text>
      </header>

      <div className="ob-food-page__intro">
        <Text variant="display" as="h1" className="ob-food-page__title">
          {restaurantName ?? 'Explore the menu'}
        </Text>
        <Text variant="bodySm" className="ob-food-page__subtitle">
          Discover, customize, and preview dishes — ordering arrives in M7.
        </Text>
      </div>

      <FoodCategoryRail categories={categories} activeId={activeId} onSelect={scrollTo} />

      <FeaturedRail title="Featured dishes" items={featured} onCustomize={setCustomizeFood} />

      <FoodSection
        id="food-todays-specials"
        title="Today's specials"
        items={todaysSpecials}
        onCustomize={setCustomizeFood}
      />

      {categories.map((category) => (
        <FoodSection
          key={category.id}
          id={`food-cat-${category.id}`}
          title={category.name}
          items={byCategory.get(category.id) ?? []}
          onCustomize={setCustomizeFood}
        />
      ))}

      <FoodSection
        id="food-recommended"
        title="Recommended for you"
        items={recommended}
        onCustomize={setCustomizeFood}
      />

      <FoodSection
        id="food-bestsellers"
        title="Best sellers"
        items={bestsellers}
        onCustomize={setCustomizeFood}
      />

      <FoodSection
        id="food-chef-specials"
        title="Chef specials"
        items={chefSpecials}
        onCustomize={setCustomizeFood}
      />

      <section className="ob-food-section" aria-label="Recently viewed">
        <Text variant="subtitle" as="h2" className="ob-food-section__title">
          Recently viewed
        </Text>
        <Card className="ob-food-placeholder">
          <Text variant="bodySm" style={{ fontWeight: 700 }}>
            Coming soon
          </Text>
          <Text variant="caption" style={{ color: 'var(--bds-color-text-secondary)' }}>
            Your browsing history will appear here in a future release.
          </Text>
        </Card>
      </section>

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

  return <FoodExperienceContent restaurantSlug={restaurantSlug ?? ''} />;
}
