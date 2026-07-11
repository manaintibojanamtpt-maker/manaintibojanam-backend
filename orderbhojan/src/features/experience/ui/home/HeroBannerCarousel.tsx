import { useEffect, useState } from 'react';
import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';
import { useReducedMotion } from '@/shared/hooks/useMedia';
import { HERO_BANNERS } from '../../data/mockCatalog';
import { useBlurUpImage } from '../../hooks/useBlurUpImage';

export function HeroBannerCarousel() {
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const slide = HERO_BANNERS[index] ?? HERO_BANNERS[0];
  const heroImage = useBlurUpImage();

  useEffect(() => {
    if (reducedMotion) return undefined;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % HERO_BANNERS.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [reducedMotion]);

  return (
    <section className="ob-hero-banner ob-section ob-section--full" aria-label="Promotional offers" aria-live="polite">
      <div
        key={slide.id}
        className="ob-hero-banner__slide ob-hero-banner__slide--fade"
        style={{ background: slide.gradient }}
      >
        <img
          src={slide.imageUrl}
          alt=""
          className={`ob-hero-banner__image ${heroImage.className}`}
          loading="lazy"
          decoding="async"
          onLoad={heroImage.onLoad}
        />
        <div className="ob-hero-banner__overlay" aria-hidden />
        <div className="ob-hero-banner__content">
          <h2 className="bds-text-title ob-hero-banner__title">{slide.title}</h2>
          <p className="bds-text-body-sm ob-hero-banner__subtitle">{slide.subtitle}</p>
          <SoftButton tone="secondary" size="compact" className="ob-hero-banner__cta" aria-label={slide.cta}>
            {slide.cta}
          </SoftButton>
        </div>
      </div>
      <div className="ob-hero-banner__dots" role="tablist" aria-label="Banner slides">
        {HERO_BANNERS.map((banner, dotIndex) => (
          <button
            key={banner.id}
            type="button"
            role="tab"
            aria-selected={dotIndex === index}
            aria-label={`Slide ${dotIndex + 1}: ${banner.title}`}
            className={`ob-hero-banner__dot${dotIndex === index ? ' ob-hero-banner__dot--active' : ''}`}
            onClick={() => setIndex(dotIndex)}
          />
        ))}
      </div>
    </section>
  );
}
