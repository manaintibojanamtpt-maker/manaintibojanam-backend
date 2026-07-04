import { Text } from '@bhojan/design-system';
import { HeroHeader } from './HeroHeader';
import { HomeSearchBar } from './HomeSearchBar';
import { HeroBannerCarousel } from './HeroBannerCarousel';
import { CategoryRail } from './CategoryRail';
import { FeaturedRestaurantsSection } from './FeaturedRestaurantsSection';
import { SkeletonRestaurantSection } from './SkeletonRestaurantSection';
import { TrendingFoodsSection } from './TrendingFoodsSection';
import { MarketplaceFloatingCart } from '../shared/MarketplaceFloatingCart';

export function HomeExperiencePage() {
  return (
    <div className="ob-home-page ob-page-enter">
      <Text variant="caption" className="bds-sr-only" as="h1">OrderBhojan Home</Text>
      <HeroHeader />
      <div className="ob-home-page__stack">
        <HomeSearchBar />
        <HeroBannerCarousel />
        <CategoryRail />
        <FeaturedRestaurantsSection />
        <SkeletonRestaurantSection sectionId="nearby" />
        <SkeletonRestaurantSection sectionId="top-rated" />
        <TrendingFoodsSection />
        <SkeletonRestaurantSection sectionId="cloud-kitchens" />
        <SkeletonRestaurantSection sectionId="recently-ordered" />
      </div>
      <MarketplaceFloatingCart />
    </div>
  );
}
