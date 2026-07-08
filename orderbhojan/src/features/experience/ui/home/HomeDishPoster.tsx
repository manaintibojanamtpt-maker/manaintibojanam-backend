import { DishPoster, DishPosterAddButton, MotionPress } from '@bhojan/design-system';

import type { MockFoodItem } from '../../domain/experience.types';

import { addExperienceFoodToCart } from '../../utils/experienceCart';
import { resolveAppetitePhoto } from '../../utils/resolveAppetitePhoto';

export interface HomeDishPosterProps {
  readonly item: MockFoodItem;
}

export function HomeDishPoster({ item }: HomeDishPosterProps) {
  const photo = resolveAppetitePhoto(item.imageUrl, 480, '8.75rem', 82);

  const price = item.oldPrice && item.oldPrice > item.price ? (
    <>
      ₹{item.price}
      <span className="ob-dish-poster__was">₹{item.oldPrice}</span>
    </>
  ) : (
    <>₹{item.price}</>
  );

  return (
    <MotionPress>
      <DishPoster
        name={item.name}
        price={price}
        imageUrl={photo.src}
        imageSrcSet={photo.srcSet}
        imageSizes={photo.sizes}
        imageBlurDataURL={photo.blurDataURL}
        imageSources={photo.sources}
        imageAlt={item.name}
        addAction={
          <DishPosterAddButton
            aria-label={`Add ${item.name}`}
            onClick={(event) => {
              event.stopPropagation();
              addExperienceFoodToCart(item);
            }}
          />
        }
      />
    </MotionPress>
  );
}
