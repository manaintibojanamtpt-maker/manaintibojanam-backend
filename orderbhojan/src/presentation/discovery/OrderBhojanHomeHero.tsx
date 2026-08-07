import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MarketplaceDiscoveryHeroView } from '@bhojan/storefront-design-system/adapters/marketplace/MarketplaceDiscoveryHeroView';
import { MarketplaceSearchBar } from '@bhojan/storefront-design-system/marketplace/MarketplaceSearchBar';
import { Skeleton } from '@bhojan/storefront-design-system/primitives/Skeleton';
import { DEFAULT_HOME_HERO_CONFIG } from '@/features/experience/data/kitchenHeroScenes';
import {
  resolveHeroFoodPhoto,
  resolveHeroFoodPhotoByUrl,
  type FoodPhotoAssetId,
} from '@/features/experience/data/food-photo-manifest';
import { useHomeHeroConfig } from '@/features/experience/hooks/useHomeHeroConfig';
import { useHomeHeroOfferRestaurants } from '@/features/experience/hooks/useHomeHeroOfferSlides';
import { useKitchenHeroMotion } from '@/features/experience/hooks/useKitchenHeroMotion';
import { mergeHomeHeroSlides } from '@/features/experience/utils/buildHomeHeroSlides';
import type { HomeHeroSlide } from '@/types/marketplace-home-hero';
import { OrderBhojanHomeLocationBar } from './OrderBhojanHomeLocationBar';
import { HomeVoiceAgentButton } from '@/features/assistant/ui/HomeVoiceAgentButton';

function resolveHeroSlidePhoto(slide: HomeHeroSlide) {
  if (slide.imageUrl) {
    return resolveHeroFoodPhotoByUrl(slide.imageUrl);
  }
  return resolveHeroFoodPhoto((slide.assetId ?? 'hero-biryani') as FoodPhotoAssetId);
}

export function OrderBhojanHomeHero() {
  const navigate = useNavigate();
  const { richMotion, prefersReducedMotion } = useKitchenHeroMotion();
  const carouselAutoAdvance = !prefersReducedMotion;
  const heroQuery = useHomeHeroConfig();
  const heroConfig = heroQuery.data ?? DEFAULT_HOME_HERO_CONFIG;
  // Defaults seed initialData — never block kitchens behind a tall hero skeleton.
  const heroReady = Boolean(heroConfig);
  const includeDiscoveryOffers = heroConfig.includeDiscoveryOffers !== false;
  const offerRestaurantsQuery = useHomeHeroOfferRestaurants(includeDiscoveryOffers);
  const [searchValue, setSearchValue] = useState('');

  const mergedSlides = useMemo(
    () => mergeHomeHeroSlides(heroConfig, offerRestaurantsQuery.data ?? []),
    [heroConfig, offerRestaurantsQuery.data],
  );

  const slides = useMemo(
    () =>
      mergedSlides.map((slide) => {
        const photo = resolveHeroSlidePhoto(slide);
        return {
          id: slide.id,
          kind: slide.kind,
          src: photo.src,
          webpSrcSet: photo.webpSrcSet,
          avifSrcSet: photo.avifSrcSet,
          alt: slide.imageAlt,
          subline: slide.subline,
          headline: slide.headline ?? heroConfig.headline,
          cta: slide.cta,
          ctaPath: slide.ctaPath,
          offerBadge: slide.offerBadge,
          restaurantName: slide.restaurantName,
          restaurantSlug: slide.restaurantSlug,
        };
      }),
    [heroConfig.headline, mergedSlides],
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const activeSlide = slides[activeIndex] ?? slides[0];
  const rotationIntervalMs = heroConfig.rotationIntervalMs;
  const isOfferSlide = activeSlide?.kind === 'offer' || Boolean(activeSlide?.offerBadge);
  const displayEyebrow = isOfferSlide ? 'Limited-time deal' : heroConfig.eyebrow;

  // Reset only when the primary slide identity changes — not when offer slides append.
  const primarySlideId = slides[0]?.id;
  useEffect(() => {
    setActiveIndex(0);
  }, [heroConfig.updatedAt, primarySlideId]);

  useEffect(() => {
    if (!carouselAutoAdvance || slides.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, rotationIntervalMs);
    return () => window.clearInterval(timer);
  }, [carouselAutoAdvance, rotationIntervalMs, slides.length]);

  useEffect(() => {
    if (!carouselAutoAdvance) return undefined;
    slides.forEach((slide, index) => {
      if (index === 0) return;
      const img = new Image();
      img.decoding = 'async';
      img.src = slide.webpSrcSet?.split(',')[0]?.trim().split(/\s+/)[0] ?? slide.src;
    });
  }, [carouselAutoAdvance, slides]);

  const goToSearch = () => {
    const trimmed = searchValue.trim();
    navigate(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search');
  };

  const handleCta = () => {
    const path = activeSlide?.ctaPath?.trim();
    if (path) {
      navigate(path);
      return;
    }
    goToSearch();
  };

  if (!heroReady) {
    return (
      <section
        className="bg-[#050403] px-4 pt-3 sm:px-6"
        aria-busy="true"
        aria-label="Loading home"
      >
        <Skeleton className="mb-2 h-7 w-40 rounded-lg ob-shimmer" />
        <Skeleton className="mb-3 h-4 w-48 rounded-md ob-shimmer" />
        <Skeleton className="mb-3.5 h-11 w-full rounded-full ob-shimmer" />
        <Skeleton className="h-[8.75rem] w-full rounded-2xl ob-shimmer" />
      </section>
    );
  }

  return (
    <MarketplaceDiscoveryHeroView
      layout="compact"
      brandName="Order"
      brandAccent="Bhojan"
      eyebrow={displayEyebrow}
      headline={activeSlide?.headline ?? heroConfig.headline}
      subline={activeSlide?.subline ?? 'Homestyle meals from kitchens near you'}
      slides={slides}
      activeIndex={activeIndex}
      animated={richMotion}
      slideDurationMs={rotationIntervalMs}
      onSlideSelect={setActiveIndex}
      ctaLabel={activeSlide?.cta}
      onCtaClick={activeSlide?.cta ? handleCta : undefined}
      onSearchIconClick={goToSearch}
      onProfileIconClick={() => navigate('/profile')}
      locationSlot={<OrderBhojanHomeLocationBar />}
      searchSlot={
        <div className="flex w-full items-center gap-2">
          <div className="min-w-0 flex-1">
            <MarketplaceSearchBar
              appearance="pill"
              value={searchValue}
              onChange={setSearchValue}
              onSubmit={goToSearch}
              onClear={() => setSearchValue('')}
              onAutocompleteFocus={goToSearch}
            />
          </div>
          <HomeVoiceAgentButton />
        </div>
      }
    />
  );
}
