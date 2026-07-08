import { useNavigate } from 'react-router-dom';
import {
  ImmersiveHero,
  MotionPage,
  MotionReveal,
  PremiumChip,
  PremiumSearch,
  Rail,
  Text,
  TrustStrip,
  TrustShieldIcon,
  TrustClockIcon,
  TrustDeliveryIcon,
  TrustVerifiedIcon,
  TrustLiveIcon,
} from '@bhojan/design-system';
import { useDiscoveryFeatureEnabled, DiscoveryHomeFeed } from '@/features/discovery';
import { HOME_CATEGORY_CHIPS, HOME_CRAVING_LINES } from '../../data/mockCatalog';
import {
  HOME_CATEGORY_PHOTO_ASSETS,
  pictureSources,
  resolveFoodPhoto,
} from '../../data/food-photo-manifest';
import { useCategoryStore } from '../../store/categoryStore';
import { useRotatingLine } from '../../hooks/useRotatingLine';
import { useHeroPreload } from '../../hooks/useHeroPreload';
import type { FoodCategoryId } from '../../domain/experience.types';
import { FeaturedRestaurantsSection } from './FeaturedRestaurantsSection';
import { TrendingFoodsSection } from './TrendingFoodsSection';
import { AiDiningGuide } from './AiDiningGuide';

const TRUST_ITEMS = [
  { id: 'fresh', label: 'Fresh', icon: <TrustClockIcon /> },
  { id: 'hygiene', label: 'Hygienic', icon: <TrustShieldIcon /> },
  { id: 'verified', label: 'Verified', icon: <TrustVerifiedIcon /> },
  { id: 'live', label: 'Live cooking', icon: <TrustLiveIcon /> },
  { id: 'delivery', label: 'Fast delivery', icon: <TrustDeliveryIcon /> },
] as const;

const HERO_PHOTO = resolveFoodPhoto('hero-biryani', 1600, 88);

function MockRestaurantFeed({ categoryId }: { categoryId: FoodCategoryId | null }) {
  return (
    <>
      <FeaturedRestaurantsSection categoryId={categoryId} />
      <TrendingFoodsSection categoryId={categoryId} />
    </>
  );
}

export function HomeExperiencePage() {
  const navigate = useNavigate();
  const discoveryEnabled = useDiscoveryFeatureEnabled();
  const { selectedId, select } = useCategoryStore();
  const craving = useRotatingLine(HOME_CRAVING_LINES);

  useHeroPreload(HERO_PHOTO.preloadHref, HERO_PHOTO.webpSrcSet);

  return (
    <MotionPage className="bds-px2-page ob-home-page">
      <Text variant="caption" className="bds-sr-only" as="h1">
        OrderBhojan — Hyderabadi Dum Biryani near you
      </Text>
      <ImmersiveHero
        variant="cinematic"
        imageUrl={HERO_PHOTO.src}
        imageSrcSet={HERO_PHOTO.webpSrcSet}
        imageSizes="100vw"
        imageBlurDataURL={HERO_PHOTO.blurDataURL}
        imageSources={pictureSources(HERO_PHOTO, '100vw')}
        imageAlt="Steaming Hyderabadi dum biryani in a handi"
        imagePriority
        subline={<span key={craving} className="ob-home-hero__craving">{craving}</span>}
        searchSlot={
          <PremiumSearch
            placeholder="Search restaurants, dishes..."
            readOnly
            onClick={() => navigate('/search')}
            onFocus={(e) => {
              e.preventDefault();
              navigate('/search');
            }}
            aria-label="Search restaurants and dishes"
          />
        }
      />

      <div className="bds-px2-page__content ob-home-page__content">
        <section className="ob-home-categories" aria-label="Categories">
          <Rail className="ob-home-categories__rail">
            {HOME_CATEGORY_CHIPS.map((cat) => {
              const assetId = HOME_CATEGORY_PHOTO_ASSETS[cat.id];
              const photo = resolveFoodPhoto(assetId, 144, 80);
              return (
                <PremiumChip
                  key={cat.id}
                  label={cat.label}
                  imageUrl={photo.src}
                  imageSrcSet={photo.webpSrcSet}
                  imageSizes="4.5rem"
                  imageBlurDataURL={photo.blurDataURL}
                  imageSources={pictureSources(photo, '4.5rem')}
                  selected={selectedId === cat.id}
                  onClick={() => select(cat.id)}
                />
              );
            })}
          </Rail>
        </section>

        <MotionReveal delay={0.05}>
          <AiDiningGuide />
          {discoveryEnabled ? (
            <DiscoveryHomeFeed />
          ) : (
            <MockRestaurantFeed categoryId={selectedId} />
          )}
        </MotionReveal>

        <section className="ob-home-trust" aria-label="Trust">
          <TrustStrip variant="scroll" iconOnly items={[...TRUST_ITEMS]} />
        </section>
      </div>
    </MotionPage>
  );
}
