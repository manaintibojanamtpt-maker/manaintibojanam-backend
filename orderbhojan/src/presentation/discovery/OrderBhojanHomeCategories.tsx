import clsx from 'clsx';
import { HOME_CATEGORY_CHIPS } from '@/features/experience/data/mockCatalog';
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

export function OrderBhojanHomeCategories({ compact = false }: OrderBhojanHomeCategoriesProps) {
  const { selectedId, select } = useCategoryStore();

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/45">
        {compact ? 'Browse cuisines' : 'Categories'}
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" role="list" aria-label="Categories">
        {HOME_CATEGORY_CHIPS.map((cat) => {
          const assetId = HOME_CATEGORY_PHOTO_ASSETS[cat.id];
          const photo = resolveCategoryChipPhoto(assetId, compact ? 112 : 144, compact ? 64 : 80);
          const selected = selectedId === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              role="listitem"
              onClick={() => select(cat.id as FoodCategoryId)}
              className={clsx(
                'group flex shrink-0 flex-col items-center gap-1.5 rounded-xl border p-1 transition-all',
                compact ? 'w-[3.75rem]' : 'w-[4.75rem] gap-2 rounded-2xl p-1.5',
                selected
                  ? 'border-[#FF7A00]/50 bg-[#FF7A00]/10 shadow-[0_8px_24px_rgba(255,122,0,0.15)]'
                  : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]',
              )}
              aria-pressed={selected}
            >
              <picture
                className={clsx(
                  'block w-full overflow-hidden rounded-lg',
                  compact ? 'h-12 rounded-lg' : 'h-16 rounded-xl',
                )}
              >
                {pictureSources(photo, compact ? '3rem' : '4.5rem').map((source) => (
                  <source key={source.type} type={source.type} srcSet={source.srcSet} sizes={source.sizes} />
                ))}
                <img
                  src={photo.src}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
              </picture>
              <span
                className={clsx(
                  'px-0.5 text-center font-bold uppercase tracking-wide',
                  compact ? 'text-[9px]' : 'text-[10px]',
                  selected ? 'text-[#FF7A00]' : 'text-white/60',
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
