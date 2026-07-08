import type { RefObject } from 'react';
import { AppetiteImage, Rail, Text } from '@bhojan/design-system';
import type { RestaurantGalleryImage } from '@/types/marketplace-restaurant';
import {
  pictureSources,
  resolveFoodPhotoByUrl,
} from '@/features/experience/data/food-photo-manifest';
import { useLazyInView } from '../hooks/useLazyInView';

export interface RestaurantGalleryRailProps {
  readonly images: readonly RestaurantGalleryImage[];
}

function GalleryImage({ image }: { readonly image: RestaurantGalleryImage }) {
  const { ref, visible } = useLazyInView();
  const photo = resolveFoodPhotoByUrl(image.url, 640, 82);

  return (
    <figure ref={ref as RefObject<HTMLElement>} className="ob-restaurant-px5__gallery-item">
      {visible ? (
        <AppetiteImage
          src={photo.src}
          alt={image.caption ?? ''}
          srcSet={photo.webpSrcSet}
          sizes="14rem"
          blurDataURL={photo.blurDataURL}
          sources={pictureSources(photo, '14rem')}
          className="ob-restaurant-px5__gallery-photo"
        />
      ) : (
        <div
          className="ob-restaurant-px5__gallery-placeholder"
          style={{ backgroundImage: `url(${photo.blurDataURL})` }}
          aria-hidden
        />
      )}
      {image.caption ? (
        <Text variant="caption" as="figcaption" className="ob-restaurant-px5__gallery-caption">
          {image.caption}
        </Text>
      ) : null}
    </figure>
  );
}

export function RestaurantGalleryRail({ images }: RestaurantGalleryRailProps) {
  return (
    <Rail className="ob-restaurant-px5__gallery-rail">
      {images.map((image) => (
        <GalleryImage key={image.id} image={image} />
      ))}
    </Rail>
  );
}
