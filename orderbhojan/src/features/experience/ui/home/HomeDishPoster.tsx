import type { MockFoodItem } from '../../domain/experience.types';
import { addExperienceFoodToCart } from '../../utils/experienceCart';
import { resolveAppetitePhoto } from '../../utils/resolveAppetitePhoto';
import { MotionPress } from '../../motion/premiumMotion';

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
    <MotionPress className="ob-home-dish-poster-wrap">
      <article className="bds-dish-poster">
        <picture className="bds-appetite-image bds-dish-poster__image">
          {photo.sources?.map((source) => (
            <source key={source.type} type={source.type} srcSet={source.srcSet} sizes={source.sizes} />
          ))}
          <img
            src={photo.src}
            srcSet={photo.srcSet}
            sizes={photo.sizes}
            alt={item.name}
            className="bds-appetite-image__img"
            loading="lazy"
            decoding="async"
          />
        </picture>
        <div className="bds-dish-poster__scrim" aria-hidden />
        <div className="bds-dish-poster__add">
          <button
            type="button"
            className="bds-dish-poster__add-btn"
            aria-label={`Add ${item.name}`}
            onClick={(event) => {
              event.stopPropagation();
              addExperienceFoodToCart(item);
            }}
          >
            <span aria-hidden>+</span>
          </button>
        </div>
        <div className="bds-dish-poster__meta">
          <span className="bds-dish-poster__name">{item.name}</span>
          <span className="bds-dish-poster__price">{price}</span>
        </div>
      </article>
    </MotionPress>
  );
}
