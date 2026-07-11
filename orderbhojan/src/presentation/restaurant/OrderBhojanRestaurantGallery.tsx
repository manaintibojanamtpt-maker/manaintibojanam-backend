import type { RefObject } from 'react';
import type { RestaurantGalleryImage } from '@/types/marketplace-restaurant';
import {
  pictureSources,
  resolveFoodPhotoByUrl,
} from '@/features/experience/data/food-photo-manifest';
import { useLazyInView } from '@/features/restaurant/hooks/useLazyInView';
import { Section } from '@bhojan/storefront-design-system/primitives/Section';
import { SectionHeader } from '@bhojan/storefront-design-system/primitives/SectionHeader';
import { GlassCard } from '@bhojan/storefront-design-system/primitives/GlassCard';

function GalleryImage({ image }: { readonly image: RestaurantGalleryImage }) {
  const { ref, visible } = useLazyInView();
  const photo = resolveFoodPhotoByUrl(image.url, 640, 82);

  return (
    <figure ref={ref as RefObject<HTMLElement>} className="w-56 flex-shrink-0">
      <GlassCard hoverEffect={false} className="!overflow-hidden !p-0">
        {visible ? (
          <picture>
            {pictureSources(photo, '14rem').map((source) => (
              <source key={source.type} type={source.type} srcSet={source.srcSet} sizes={source.sizes} />
            ))}
            <img
              src={photo.src}
              alt={image.caption ?? ''}
              loading="lazy"
              decoding="async"
              className="aspect-[4/3] w-full object-cover"
            />
          </picture>
        ) : (
          <div
            className="aspect-[4/3] w-full bg-white/5 bg-cover bg-center"
            style={{ backgroundImage: `url(${photo.blurDataURL})` }}
            aria-hidden
          />
        )}
        {image.caption ? (
          <figcaption className="px-3 py-2 text-xs text-white/60">{image.caption}</figcaption>
        ) : null}
      </GlassCard>
    </figure>
  );
}

export interface OrderBhojanRestaurantGalleryProps {
  readonly images: readonly RestaurantGalleryImage[];
}

export function OrderBhojanRestaurantGallery({ images }: OrderBhojanRestaurantGalleryProps) {
  return (
    <Section density="comfortable" background="default" className="!py-6">
      <SectionHeader title="Gallery" align="left" className="!mb-4 !text-left" />
      <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
        {images.map((image) => (
          <GalleryImage key={image.id} image={image} />
        ))}
      </div>
    </Section>
  );
}
