import {
  MotionPage,
  MotionReveal,
  PremiumChip,
  Rail,
  TrustStrip,
  TrustShieldIcon,
  TrustClockIcon,
  TrustDeliveryIcon,
  TrustVerifiedIcon,
  TrustLiveIcon,
} from '@bhojan/design-system';
import { useDiscoveryFeatureEnabled, DiscoveryHomeFeed } from '@/features/discovery';
import { HOME_CATEGORY_CHIPS } from '../../data/mockCatalog';
import {
  HOME_CATEGORY_PHOTO_ASSETS,
  pictureSources,
  resolveCategoryChipPhoto,
} from '../../data/food-photo-manifest';
import { useCategoryStore } from '../../store/categoryStore';
import type { FoodCategoryId } from '../../domain/experience.types';
import { HomeSpotlightMockFeed } from './HomeSpotlightMockFeed';
import { KitchenDoorHero } from './KitchenDoorHero';
import { HomeLocationBar } from './HomeLocationBar';

const TRUST_ITEMS = [
  { id: 'fresh', label: 'Fresh', icon: <TrustClockIcon /> },
  { id: 'hygiene', label: 'Hygienic', icon: <TrustShieldIcon /> },
  { id: 'verified', label: 'Verified', icon: <TrustVerifiedIcon /> },
  { id: 'live', label: 'Live cooking', icon: <TrustLiveIcon /> },
  { id: 'delivery', label: 'Fast delivery', icon: <TrustDeliveryIcon /> },
] as const;

function MockRestaurantFeed({ categoryId }: { categoryId: FoodCategoryId | null }) {
  return <HomeSpotlightMockFeed categoryId={categoryId} />;
}

export function HomeExperiencePage() {
  const discoveryEnabled = useDiscoveryFeatureEnabled();
  const { selectedId, select } = useCategoryStore();

  return (
    <MotionPage className="bds-px2-page ob-home-page">
      <KitchenDoorHero />
      <HomeLocationBar />

      <div className="bds-px2-page__content ob-home-page__content">
        <section className="ob-home-categories" aria-label="Categories">
          <Rail className="ob-home-categories__rail">
            {HOME_CATEGORY_CHIPS.map((cat) => {
              const assetId = HOME_CATEGORY_PHOTO_ASSETS[cat.id];
              const photo = resolveCategoryChipPhoto(assetId, 144, 80);
              return (
                <PremiumChip
                  key={cat.id}
                  label={cat.label}
                  imageUrl={photo.src}
                  imageSrcSet={photo.webpSrcSet}
                  imageSizes="4.5rem"
                  imageBlurDataURL={photo.blurDataURL}
                  imageSources={pictureSources(photo, '4.5rem')}
                  imageFallbackSrc={photo.fallbackSrc}
                  selected={selectedId === cat.id}
                  onClick={() => select(cat.id)}
                />
              );
            })}
          </Rail>
        </section>

        <MotionReveal delay={0.05}>
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
