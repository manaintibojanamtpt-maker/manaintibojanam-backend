import { QuantityStepperView } from '@bhojan/storefront-design-system/primitives/QuantityStepperView';
import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';
import { useCartStore } from '@/features/cart/store/cartStore';
import type { MockFoodItem } from '../../domain/experience.types';
import { addExperienceFoodToCart } from '../../utils/experienceCart';
import { foodPhotoUrl } from '../../utils/foodPhotoUrl';
import { MotionPress } from '../../motion/premiumMotion';

export interface MarketplaceFoodTileProps {
  readonly item: MockFoodItem;
}

export function MarketplaceFoodTile({ item }: MarketplaceFoodTileProps) {
  const quantity = useCartStore((state) => state.lines.reduce((acc, l) => (l.foodId === item.id ? acc + l.quantity : acc), 0));
  const targetLineId = useCartStore((state) => {
    const lines = state.lines.filter((l) => l.foodId === item.id);
    return lines.length > 0 ? lines[lines.length - 1].lineId : undefined;
  });
  const setQuantity = useCartStore((s) => s.setQuantity);

  const discount =
    item.oldPrice && item.oldPrice > item.price
      ? Math.round(((item.oldPrice - item.price) / item.oldPrice) * 100)
      : null;

  const badge = (
    <>
      <span className={`bds-badge ${item.isVeg ? 'bds-badge--veg' : 'bds-badge--non-veg'}`}>
        {item.isVeg ? 'Veg' : 'Non-Veg'}
      </span>
      {discount ? <span className="bds-badge bds-badge--offer">{discount}% OFF</span> : null}
    </>
  );

  const priceLine = (
    <>
      <span>₹{item.price}</span>
      {item.oldPrice ? (
        <span
          className="bds-text-caption"
          style={{ textDecoration: 'line-through', color: 'var(--bds-color-text-secondary)', marginLeft: 'var(--bds-space-2)' }}
        >
          ₹{item.oldPrice}
        </span>
      ) : null}
    </>
  );

  return (
    <div className="bds-food-row bds-food-row--compact bds-food-row--rail">
      <div className="bds-food-row__body">
        <div className="bds-food-row__badges">{badge}</div>
        <div className="bds-food-row__name bds-text-title-sm">{item.name}</div>
        <p
          className="bds-text-body-sm bds-food-row__description"
          style={{ color: 'var(--bds-color-text-secondary)' }}
        >
          {item.description}
        </p>
        <div className="bds-food-row__price bds-text-price-lg" style={{ color: 'var(--bds-color-primary)' }}>
          {priceLine}
        </div>
      </div>
      <div className="bds-food-row__thumb-wrap">
        <img
          src={foodPhotoUrl(item.imageUrl, 400, 78)}
          alt={item.name}
          className="bds-food-row__thumb"
          loading="lazy"
          decoding="async"
        />
        <div className="bds-food-row__add">
          {quantity > 0 ? (
            <QuantityStepperView
              value={quantity}
              min={0}
              onChange={(next) => targetLineId && setQuantity(targetLineId, next)}
              ariaLabel={`Quantity for ${item.name}`}
            />
          ) : (
            <MotionPress>
              <SoftButton
                type="button"
                size="compact"
                className="bds-btn--appetite"
                aria-label={`Add ${item.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  addExperienceFoodToCart(item);
                }}
              >
                Add
              </SoftButton>
            </MotionPress>
          )}
        </div>
      </div>
    </div>
  );
}
