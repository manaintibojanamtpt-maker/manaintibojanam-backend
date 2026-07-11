import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { KITCHEN_HERO_HEADLINE, KITCHEN_HERO_SCENES } from '../../data/kitchenHeroScenes';
import { resolveFoodPhoto } from '../../data/food-photo-manifest';
import { useKitchenHeroMotion } from '../../hooks/useKitchenHeroMotion';
import { useHeroPreload } from '../../hooks/useHeroPreload';

const SCENE_INTERVAL_MS = 8000;
const CROSSFADE_MS = 600;

export function KitchenDoorHero() {
  const navigate = useNavigate();
  const { richMotion } = useKitchenHeroMotion();
  const scenes = KITCHEN_HERO_SCENES;

  const resolvedScenes = useMemo(
    () =>
      scenes.map((scene) => ({
        ...scene,
        photo: resolveFoodPhoto(scene.assetId, 1920, 92),
      })),
    [scenes],
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const activeScene = resolvedScenes[activeIndex] ?? resolvedScenes[0];

  useHeroPreload(activeScene.photo.preloadHref, activeScene.photo.webpSrcSet);

  useEffect(() => {
    if (!richMotion || resolvedScenes.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % resolvedScenes.length);
    }, SCENE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [richMotion, resolvedScenes.length]);

  useEffect(() => {
    if (!richMotion) return undefined;
    resolvedScenes.forEach((scene, index) => {
      if (index === 0) return;
      const img = new Image();
      img.decoding = 'async';
      img.src = scene.photo.preloadHref;
    });
  }, [richMotion, resolvedScenes]);

  const openSearch = () => navigate('/search');

  return (
    <section className="ob-kitchen-hero" aria-label="Home kitchens">
      <div className="ob-kitchen-hero__frame ob-stove-glow-frame">
        <div className="ob-kitchen-hero__media" aria-hidden>
          {resolvedScenes.map((scene, index) => {
            const isActive = !richMotion ? index === 0 : index === activeIndex;
            return (
              <picture
                key={scene.id}
                className={`ob-kitchen-hero__slide${isActive ? ' ob-kitchen-hero__slide--active' : ''}${
                  richMotion ? ' ob-kitchen-hero__slide--animated' : ''
                }`}
              >
                {scene.photo.avifSrcSet ? (
                  <source type="image/avif" srcSet={scene.photo.avifSrcSet} sizes="100vw" />
                ) : null}
                {scene.photo.webpSrcSet ? (
                  <source type="image/webp" srcSet={scene.photo.webpSrcSet} sizes="100vw" />
                ) : null}
                <img
                  src={scene.photo.src}
                  alt=""
                  className={`ob-kitchen-hero__img${richMotion ? ' ob-kitchen-hero__img--ken-burns' : ''}`}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  fetchPriority={index === 0 ? 'high' : 'auto'}
                  decoding="async"
                />
              </picture>
            );
          })}
        </div>

        <div className="ob-kitchen-hero__scrim" aria-hidden />
        <div className="ob-kitchen-hero__glow" aria-hidden />
        <div className="ob-kitchen-hero__stove-accent" aria-hidden />

        <div className="ob-kitchen-hero__content">
          <div className="ob-kitchen-hero__text-well" aria-hidden />
          <p className="ob-kitchen-hero__eyebrow">OrderBhojan · home kitchens</p>
          <h1 className="ob-kitchen-hero__headline">{KITCHEN_HERO_HEADLINE}</h1>
          <p className="ob-kitchen-hero__subline" key={activeScene.id}>
            {activeScene.subline}
          </p>

          <div className="ob-kitchen-hero__search-dock">
            <label className="bds-premium-search bds-glass-surface ob-kitchen-hero__search-input">
              <Search className="h-[18px] w-[18px] shrink-0 text-white/60" aria-hidden />
              <input
                className="bds-premium-search__input"
                placeholder="Search dishes, kitchens…"
                readOnly
                onClick={openSearch}
                onFocus={(e) => {
                  e.preventDefault();
                  openSearch();
                }}
                aria-label="Search dishes and home kitchens"
              />
            </label>
          </div>
        </div>
      </div>

      {richMotion && resolvedScenes.length > 1 ? (
        <div className="ob-kitchen-hero__dots" aria-hidden>
          {resolvedScenes.map((scene, index) => (
            <span
              key={scene.id}
              className={`ob-kitchen-hero__dot${index === activeIndex ? ' ob-kitchen-hero__dot--active' : ''}`}
            />
          ))}
        </div>
      ) : null}

      <span className="bds-sr-only">
        {activeScene.imageAlt}
      </span>
    </section>
  );
}

export { CROSSFADE_MS, SCENE_INTERVAL_MS };
