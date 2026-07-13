import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MarketplaceDiscoveryHeroView } from '@bhojan/storefront-design-system/adapters/marketplace/MarketplaceDiscoveryHeroView';
import { MarketplaceSearchBar } from '@bhojan/storefront-design-system/marketplace/MarketplaceSearchBar';
import { KITCHEN_HERO_HEADLINE, KITCHEN_HERO_SCENES } from '@/features/experience/data/kitchenHeroScenes';
import { resolveFoodPhoto } from '@/features/experience/data/food-photo-manifest';
import { useKitchenHeroMotion } from '@/features/experience/hooks/useKitchenHeroMotion';
import { useHeroPreload } from '@/features/experience/hooks/useHeroPreload';
import { OrderBhojanHomeLocationBar } from './OrderBhojanHomeLocationBar';

const SCENE_INTERVAL_MS = 8000;

export function OrderBhojanHomeHero() {
  const navigate = useNavigate();
  const { richMotion } = useKitchenHeroMotion();
  const [searchValue, setSearchValue] = useState('');

  const slides = useMemo(
    () =>
      KITCHEN_HERO_SCENES.map((scene) => {
        const photo = resolveFoodPhoto(scene.assetId, 1920, 92);
        return {
          id: scene.id,
          src: photo.src,
          webpSrcSet: photo.webpSrcSet,
          avifSrcSet: photo.avifSrcSet,
          alt: scene.imageAlt,
          subline: scene.subline,
        };
      }),
    [],
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const activeScene = slides[activeIndex] ?? slides[0];

  useHeroPreload(activeScene?.src ?? '', activeScene?.webpSrcSet);

  useEffect(() => {
    if (!richMotion || slides.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, SCENE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [richMotion, slides.length]);

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

  return (
    <MarketplaceDiscoveryHeroView
      eyebrow="OrderBhojan · home kitchens"
      headline={KITCHEN_HERO_HEADLINE}
      subline={activeScene?.subline ?? 'Discover kitchens near you'}
      slides={slides}
      activeIndex={activeIndex}
      animated={richMotion}
      onSlideSelect={setActiveIndex}
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
