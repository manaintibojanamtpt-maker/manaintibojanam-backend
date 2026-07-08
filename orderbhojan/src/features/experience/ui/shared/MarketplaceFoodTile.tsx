import {
  Badge,
  FoodRow,
  FoodRowAddButton,
  MotionPress,
  QuantityStepper,
  Text,
} from '@bhojan/design-system';
import { buildCartLineId, useCartStore } from '@/features/cart/store/cartStore';
import type { MockFoodItem } from '../../domain/experience.types';
import { addExperienceFoodToCart } from '../../utils/experienceCart';
import { foodPhotoUrl } from '../../utils/foodPhotoUrl';

export interface MarketplaceFoodTileProps {
  readonly item: MockFoodItem;
}

export function MarketplaceFoodTile({ item }: MarketplaceFoodTileProps) {
  const lineId = buildCartLineId({ foodId: item.id });
  const line = useCartStore((s) => s.lines.find((entry) => entry.lineId === lineId));
  const setQuantity = useCartStore((s) => s.setQuantity);
  const quantity = line?.quantity ?? 0;

  const discount =
    item.oldPrice && item.oldPrice > item.price
      ? Math.round(((item.oldPrice - item.price) / item.oldPrice) * 100)
      : null;

  const badge = (
    <>
      <Badge variant={item.isVeg ? 'veg' : 'nonVeg'}>{item.isVeg ? 'Veg' : 'Non-Veg'}</Badge>
      {discount ? <Badge variant="offer">{discount}% OFF</Badge> : null}
    </>
  );

  const priceLine = (
    <>
      <span>₹{item.price}</span>
      {item.oldPrice ? (
        <Text variant="caption" as="span" style={{ textDecoration: 'line-through', color: 'var(--bds-color-text-secondary)', marginLeft: 'var(--bds-space-2)' }}>
          ₹{item.oldPrice}
        </Text>
      ) : null}
    </>
  );

  return (
    <FoodRow
      className="bds-food-row--rail"
      density="compact"
      name={item.name}
      description={item.description}
      price={priceLine}
      imageUrl={foodPhotoUrl(item.imageUrl, 400, 78)}
      imageAlt={item.name}
      badge={badge}
      action={
        quantity > 0 ? (
          <QuantityStepper
            value={quantity}
            onChange={(next) => setQuantity(lineId, next)}
            label={`Quantity for ${item.name}`}
          />
        ) : (
          <MotionPress>
            <FoodRowAddButton
              label="Add"
              aria-label={`Add ${item.name}`}
              onClick={(event) => {
                event.stopPropagation();
                addExperienceFoodToCart(item);
              }}
            />
          </MotionPress>
        )
      }
    />
  );
}
