import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MarketplaceDiscoveryHeroView } from '@bhojan/storefront-design-system/adapters/marketplace/MarketplaceDiscoveryHeroView';
import { MarketplaceSearchBar } from '@bhojan/storefront-design-system/marketplace/MarketplaceSearchBar';
import { DEFAULT_HOME_HERO_CONFIG } from '@/features/experience/data/kitchenHeroScenes';
import {
  resolveFoodPhoto,
  resolveFoodPhotoByUrl,
  type FoodPhotoAssetId,
} from '@/features/experience/data/food-photo-manifest';
import { useHomeHeroConfig } from '@/features/experience/hooks/useHomeHeroConfig';
import { useKitchenHeroMotion } from '@/features/experience/hooks/useKitchenHeroMotion';
import { OrderBhojanHomeLocationBar } from './OrderBhojanHomeLocationBar';

const HD_PRIMARY_WIDTH = 1920;
const HD_QUALITY = 92;

export function OrderBhojanHomeHero() {
  const navigate = useNavigate();
  const { richMotion } = useKitchenHeroMotion();
  const heroQuery = useHomeHeroConfig();
  const heroConfig = heroQuery.data ?? DEFAULT_HOME_HERO_CONFIG;
  const [searchValue, setSearchValue] = useState('');

  const slides = useMemo(
    () =>
      heroConfig.slides.map((slide) => {
        const photo = slide.imageUrl
          ? resolveFoodPhotoByUrl(slide.imageUrl, HD_PRIMARY_WIDTH, HD_QUALITY)
          : resolveFoodPhoto(
              (slide.assetId ?? 'hero-biryani') as FoodPhotoAssetId,
              HD_PRIMARY_WIDTH,
              HD_QUALITY,
            );
        return {
          id: slide.id,
          src: photo.src,
          webpSrcSet: photo.webpSrcSet,
          avifSrcSet: photo.avifSrcSet,
          alt: slide.imageAlt,
          subline: slide.subline,
          headline: slide.headline,
          cta: slide.cta,
          ctaPath: slide.ctaPath,
        };
      }),
    [heroConfig.slides],
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const activeSlide = slides[activeIndex] ?? slides[0];
  const rotationIntervalMs = heroConfig.rotationIntervalMs;

  useEffect(() => {
    setActiveIndex(0);
  }, [heroConfig.updatedAt, slides.length]);

  useEffect(() => {
    if (!richMotion || slides.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, rotationIntervalMs);
    return () => window.clearInterval(timer);
  }, [richMotion, rotationIntervalMs, slides.length]);

  useEffect(() => {
    if (!richMotion) return undefined;
    slides.forEach((slide, index) => {
      if (index === 0) return;
      const img = new Image();
      img.decoding = 'async';
      img.src = slide.src;
    });
  }, [richMotion, slides]);

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
      eyebrow={heroConfig.eyebrow}
      headline={activeSlide?.headline ?? heroConfig.headline}
      subline={activeSlide?.subline ?? 'Discover kitchens near you'}
      slides={slides}
      activeIndex={activeIndex}
      animated={richMotion}
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
