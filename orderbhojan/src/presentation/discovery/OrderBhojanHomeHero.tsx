import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MarketplaceDiscoveryHeroView } from '@bhojan/storefront-design-system/adapters/marketplace/MarketplaceDiscoveryHeroView';
import { MarketplaceSearchBar } from '@bhojan/storefront-design-system/marketplace/MarketplaceSearchBar';
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

  useEffect(() => {
    setActiveIndex(0);
  }, [heroConfig.updatedAt, slides.length]);

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

  return (
    <MarketplaceDiscoveryHeroView
      eyebrow={displayEyebrow}
      headline={activeSlide?.headline ?? heroConfig.headline}
      subline={activeSlide?.subline ?? 'Discover kitchens near you'}
      slides={slides}
      activeIndex={activeIndex}
      animated={richMotion}
      slideDurationMs={rotationIntervalMs}
      onSlideSelect={setActiveIndex}
      ctaLabel={activeSlide?.cta}
      onCtaClick={activeSlide?.cta ? handleCta : undefined}
      locationSlot={<OrderBhojanHomeLocationBar />}
      searchSlot={
        <MarketplaceSearchBar
          value={searchValue}
          onChange={setSearchValue}
          onSubmit={goToSearch}
          onClear={() => setSearchValue('')}
          onAutocompleteFocus={goToSearch}
        />
      }
    />
  );
}
