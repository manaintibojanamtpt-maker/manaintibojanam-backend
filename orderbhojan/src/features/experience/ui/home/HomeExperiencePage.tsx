import { Text } from '@bhojan/design-system';
import { useDiscoveryFeatureEnabled, DiscoveryHomeFeed } from '@/features/discovery';
import { MotionPage, MotionReveal } from '@/features/experience/motion/premiumMotion';
import { HeroHeader } from './HeroHeader';
import { HomeSearchBar } from './HomeSearchBar';
import { HeroBannerCarousel } from './HeroBannerCarousel';
import { CategoryRail } from './CategoryRail';
import { FeaturedRestaurantsSection } from './FeaturedRestaurantsSection';
import { SkeletonRestaurantSection } from './SkeletonRestaurantSection';
import { TrendingFoodsSection } from './TrendingFoodsSection';
import { MarketplaceFloatingCart } from '../shared/MarketplaceFloatingCart';

function MockRestaurantRails() {
  return (
    <>
      <FeaturedRestaurantsSection />
      <SkeletonRestaurantSection sectionId="nearby" />
      <SkeletonRestaurantSection sectionId="top-rated" />
      <SkeletonRestaurantSection sectionId="cloud-kitchens" />
      <SkeletonRestaurantSection sectionId="recently-ordered" />
    </>
  );
}

export function HomeExperiencePage() {
  const discoveryEnabled = useDiscoveryFeatureEnabled();

  return (
    <MotionPage className="ob-home-page ob-page-enter ob-m65-home">
      <Text variant="caption" className="bds-sr-only" as="h1">OrderBhojan Home</Text>
      <HeroHeader />
      <div className="ob-home-page__stack">
        <MotionReveal>
          <HomeSearchBar />
        </MotionReveal>
        <MotionReveal delay={0.04}>
          <HeroBannerCarousel />
        </MotionReveal>
        <MotionReveal delay={0.08}>
          <CategoryRail />
        </MotionReveal>
        <MotionReveal delay={0.12}>
          {discoveryEnabled ? <DiscoveryHomeFeed /> : <MockRestaurantRails />}
        </MotionReveal>
        <MotionReveal delay={0.16}>
          <TrendingFoodsSection />
        </MotionReveal>
      </div>
      <MarketplaceFloatingCart />
    </MotionPage>
  );
}
