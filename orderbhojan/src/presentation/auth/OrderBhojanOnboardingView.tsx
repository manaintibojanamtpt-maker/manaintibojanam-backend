import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { DEFAULT_HOME_HERO_CONFIG } from '@/features/experience/data/kitchenHeroScenes';
import {
  resolveHeroFoodPhoto,
  resolveHeroFoodPhotoByUrl,
  type FoodPhotoAssetId,
} from '@/features/experience/data/food-photo-manifest';
import { useHomeHeroConfig } from '@/features/experience/hooks/useHomeHeroConfig';
import { mergeHomeHeroSlides } from '@/features/experience/utils/buildHomeHeroSlides';
import type { HomeHeroSlide } from '@/types/marketplace-home-hero';
import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';
import { Skeleton } from '@bhojan/storefront-design-system/primitives/Skeleton';

const LOGO_SRC = '/brand/orderbhojan-logo.png';

function resolveHeroSlidePhoto(slide: HomeHeroSlide) {
  if (slide.imageUrl) {
    return resolveHeroFoodPhotoByUrl(slide.imageUrl);
  }
  return resolveHeroFoodPhoto((slide.assetId ?? 'hero-biryani') as FoodPhotoAssetId);
}

export interface OrderBhojanOnboardingViewProps {
  readonly loading?: boolean;
  readonly title?: string;
  readonly subtitle?: string;
  readonly children?: ReactNode;
  readonly googlePending?: boolean;
  readonly onGoogleSignIn?: () => void;
  readonly errorMessage?: string;
  readonly onDismissError?: () => void;
}

export function OrderBhojanOnboardingView({
  loading = false,
  title = 'Log in or sign up',
  subtitle = 'Home kitchens across India — delivered hot, fresh, and hygienic.',
  children,
  googlePending = false,
  onGoogleSignIn,
  errorMessage,
  onDismissError,
}: OrderBhojanOnboardingViewProps) {
  const heroQuery = useHomeHeroConfig();
  const heroConfig = heroQuery.data ?? DEFAULT_HOME_HERO_CONFIG;
  const heroReady = heroQuery.isFetched;

  const mergedSlides = useMemo(
    () =>
      mergeHomeHeroSlides(
        { ...heroConfig, includeDiscoveryOffers: false },
        [],
      ),
    [heroConfig],
  );

  const slides = useMemo(
    () =>
      mergedSlides.map((slide) => {
        const photo = resolveHeroSlidePhoto(slide);
        return {
          id: slide.id,
          headline: slide.headline ?? heroConfig.headline,
          subline: slide.subline,
          src: photo.src,
          webpSrcSet: photo.webpSrcSet,
          alt: slide.imageAlt,
        };
      }),
    [heroConfig.headline, mergedSlides],
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const activeSlide = slides[activeIndex] ?? slides[0];
  const rotationIntervalMs = heroConfig.rotationIntervalMs;

  useEffect(() => {
    setActiveIndex(0);
  }, [heroConfig.updatedAt, slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, rotationIntervalMs);
    return () => window.clearInterval(timer);
  }, [rotationIntervalMs, slides.length]);

  const displayEyebrow = heroConfig.eyebrow;

  return (
    <div className="ob-onboarding relative flex min-h-[100dvh] flex-col bg-[#070504] text-[#fffaf3]">
      <div className="ob-onboarding-hero relative min-h-[min(52vh,440px)] flex-1 overflow-hidden">
        <div className="absolute inset-0 bg-[#070504]" aria-hidden />
        {!heroReady ? (
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-[#120c0a] via-[#070504] to-[#050403]" />
            <div className="relative z-10 flex h-full flex-col justify-between px-5 pb-8 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
              <div className="flex items-center gap-3">
                <Skeleton className="h-11 w-11 rounded-xl ob-shimmer" />
                <div className="space-y-2">
                  <Skeleton className="h-2.5 w-24 rounded ob-shimmer" />
                  <Skeleton className="h-4 w-28 rounded ob-shimmer" />
                </div>
              </div>
              <div className="max-w-md space-y-2">
                <Skeleton className="h-9 w-[min(100%,18rem)] rounded-xl ob-shimmer" />
                <Skeleton className="h-4 w-[min(100%,14rem)] rounded-lg ob-shimmer" />
              </div>
            </div>
          </>
        ) : (
          <>
            {slides.map((slide, index) => {
              const isActive = index === activeIndex;
              return (
                <picture
                  key={slide.id}
                  className={`ob-onboarding-slide absolute inset-0 ${isActive ? 'ob-onboarding-slide--active' : ''}`}
                  aria-hidden={!isActive}
                >
                  {slide.webpSrcSet ? (
                    <source type="image/webp" srcSet={slide.webpSrcSet} sizes="100vw" />
                  ) : null}
                  <img
                    src={slide.src}
                    alt=""
                    className="h-full w-full object-cover object-center saturate-[1.06] contrast-[1.02]"
                    loading={index === 0 ? 'eager' : 'lazy'}
                    fetchPriority={index === 0 ? 'high' : 'auto'}
                    decoding="async"
                  />
                </picture>
              );
            })}

            <div className="ob-onboarding-hero-scrim pointer-events-none absolute inset-0" aria-hidden />

            <div className="relative z-10 flex h-full flex-col justify-between px-5 pb-8 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
              <div className="flex items-center gap-3">
                <img
                  src={LOGO_SRC}
                  alt="OrderBhojan"
                  className="h-11 w-11 rounded-xl object-cover shadow-[0_0_32px_-8px_rgba(255,107,53,0.55)]"
                  width={44}
                  height={44}
                  decoding="async"
                />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">
                    {displayEyebrow}
                  </p>
                  <p className="text-sm font-semibold text-white/90">OrderBhojan</p>
                </div>
              </div>

              <div className="max-w-md space-y-2" aria-live="polite">
                <h1 className="ob-onboarding-hero-title text-[1.75rem] font-bold leading-[1.08] tracking-tight text-white sm:text-[2rem]">
                  {activeSlide?.headline}
                </h1>
                <p className="text-sm leading-relaxed text-white/72 sm:text-[15px]">{activeSlide?.subline}</p>
                {slides.length > 1 ? (
                  <div className="flex gap-1.5 pt-2" role="tablist" aria-label="Hero slides">
                    {slides.map((slide, index) => (
                      <button
                        key={slide.id}
                        type="button"
                        role="tab"
                        aria-selected={index === activeIndex}
                        aria-label={`Slide ${index + 1}`}
                        className={`h-1.5 rounded-full transition-all ${
                          index === activeIndex ? 'w-6 bg-[#FF7A00]' : 'w-1.5 bg-white/30'
                        }`}
                        onClick={() => setActiveIndex(index)}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="ob-onboarding-sheet relative z-20 -mt-6 rounded-t-[2rem] border border-white/[0.08] bg-[#0c0908] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 shadow-[0_-24px_64px_-24px_rgba(0,0,0,0.85)] sm:px-6">
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20" aria-hidden />

        {loading ? (
          <div className="space-y-3 py-2" aria-busy="true" aria-label="Checking session">
            <Skeleton className="h-7 w-40 rounded-xl ob-shimmer" />
            <Skeleton className="h-4 w-full rounded-lg ob-shimmer" />
            <Skeleton className="mt-4 h-12 w-full rounded-2xl ob-shimmer" />
            <Skeleton className="h-12 w-full rounded-2xl ob-shimmer" />
          </div>
        ) : (
          <>
            <header className="mb-5 space-y-1.5">
              <h2 className="text-xl font-bold tracking-tight text-white">{title}</h2>
              <p className="text-sm leading-relaxed text-white/55">{subtitle}</p>
            </header>

            <div className="flex flex-col gap-4">{children}</div>

            {onGoogleSignIn ? (
              <>
                <div className="my-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">or</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>
                <SoftButton type="button" tone="secondary" fullWidth disabled={googlePending} onClick={onGoogleSignIn}>
                  {googlePending ? 'Signing in…' : 'Continue with Google'}
                </SoftButton>
              </>
            ) : null}

            {errorMessage ? (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300"
              >
                {errorMessage}
                {onDismissError ? (
                  <SoftButton type="button" tone="ghost" size="compact" className="ml-2" onClick={onDismissError}>
                    Dismiss
                  </SoftButton>
                ) : null}
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
