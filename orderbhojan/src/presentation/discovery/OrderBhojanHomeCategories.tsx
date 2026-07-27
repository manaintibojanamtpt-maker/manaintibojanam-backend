import clsx from 'clsx';
import { HOME_CATEGORY_CHIPS } from '@/features/experience/data/mockCatalog';
import {
  isHomeCategoryDiscoveryFilterActive,
  toggleHomeCategoryDiscoveryFilter,
} from '@/features/discovery/domain/homeCategoryCuisine';
import { useDiscoveryFeatureEnabled } from '@/features/discovery/hooks/useDiscoveryFeature';
import { useDiscoveryFilterStore } from '@/features/discovery/store/discoveryFilterStore';
import {
  HOME_CATEGORY_PHOTO_ASSETS,
  pictureSources,
  resolveCategoryChipPhoto,
} from '@/features/experience/data/food-photo-manifest';
import { useCategoryStore } from '@/features/experience/store/categoryStore';
import type { FoodCategoryId } from '@/features/experience/domain/experience.types';

export interface OrderBhojanHomeCategoriesProps {
  readonly compact?: boolean;
}

const CATEGORY_IMAGE_OBJECT_POSITION: Record<(typeof HOME_CATEGORY_CHIPS)[number]['id'], string> = {
  pizza: '50% 45%',
  biryani: '50% 50%',
  meals: '50% 38%',
  'south-indian': '50% 42%',
  'north-indian': '50% 48%',
};

export function OrderBhojanHomeCategories({ compact = false }: OrderBhojanHomeCategoriesProps) {
  const discoveryEnabled = useDiscoveryFeatureEnabled();
  const { selectedId, select } = useCategoryStore();
  const cuisines = useDiscoveryFilterStore((s) => s.filters.cuisines);
  const setFilters = useDiscoveryFilterStore((s) => s.setFilters);

  const circleSize = compact ? 'size-[3.75rem]' : 'size-[4.75rem] sm:size-[5rem]';
  const photoWidth = compact ? 120 : 144;

  return (
    <div className="space-y-2.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#c4b5a5]">
        {compact ? 'Browse cuisines' : 'Categories'}
      </p>
      <div
        className={clsx(
          'flex gap-3 overflow-x-auto pb-1 no-scrollbar snap-x snap-mandatory',
          compact && '-mx-3 px-3',
        )}
        role="list"
        aria-label="Browse cuisines"
      >
        {HOME_CATEGORY_CHIPS.map((cat) => {
          const assetId = HOME_CATEGORY_PHOTO_ASSETS[cat.id];
          const photo = resolveCategoryChipPhoto(assetId, photoWidth, 84);
          const selected = discoveryEnabled
            ? isHomeCategoryDiscoveryFilterActive(cat.id, cuisines)
            : selectedId === cat.id;

          const handleSelect = () => {
            if (discoveryEnabled) {
              setFilters({
                cuisines: toggleHomeCategoryDiscoveryFilter(cat.id, cuisines),
              });
              return;
            }
            select(cat.id as FoodCategoryId);
          };

          return (
            <button
              key={cat.id}
              type="button"
              role="listitem"
              onClick={handleSelect}
              className={clsx(
                'group flex shrink-0 snap-start flex-col items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e85d04]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050403]',
                compact ? 'w-[4.25rem]' : 'w-[4.75rem] sm:w-[5rem]',
              )}
              aria-pressed={selected}
              aria-label={`${selected ? 'Clear' : 'Filter by'} ${cat.label}`}
            >
              <span
                className={clsx(
                  'relative rounded-full p-[2px] transition-all duration-300 ease-out',
                  circleSize,
                  selected
                    ? 'bg-gradient-to-br from-[#e85d04] via-[#f4a261] to-[#e85d04]/70 shadow-[0_8px_24px_rgba(232,93,4,0.28)]'
                    : 'bg-white/10 group-hover:bg-white/16 group-active:scale-95',
                )}
              >
                <picture
                  className={clsx(
                    'block size-full overflow-hidden rounded-full bg-[#1a1410]',
                    selected && 'ring-2 ring-[#050403]/80',
                  )}
                >
                  {pictureSources(photo, compact ? '3.75rem' : '4.5rem').map((source) => (
                    <source key={source.type} type={source.type} srcSet={source.srcSet} sizes={source.sizes} />
                  ))}
                  <img
                    src={photo.src}
                    alt=""
                    className={clsx(
                      'size-full scale-[1.12] object-cover transition-transform duration-500 ease-out',
                      'group-hover:scale-[1.2] group-active:scale-[1.08]',
                    )}
                    style={{ objectPosition: CATEGORY_IMAGE_OBJECT_POSITION[cat.id] }}
                    loading="lazy"
                    decoding="async"
                  />
                </picture>
              </span>
              <span
                className={clsx(
                  'max-w-full truncate px-0.5 text-center text-[11px] font-semibold leading-tight transition-colors duration-300',
                  selected ? 'text-[#e85d04]' : 'text-[#c4b5a5] group-hover:text-[#fff8f0]',
                )}
              >
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
