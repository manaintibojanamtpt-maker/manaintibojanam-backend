import {
  Badge,
  Button,
  FoodCard,
  QuantityStepper,
  Text,
} from '@bhojan/design-system';
import type { MockFoodItem } from '../../domain/experience.types';
import { useCartPreviewStore } from '../../store/cartPreviewStore';

export interface MarketplaceFoodTileProps {
  readonly item: MockFoodItem;
}

export function MarketplaceFoodTile({ item }: MarketplaceFoodTileProps) {
  const { itemCount, addMockItem, removeMockItem } = useCartPreviewStore();
  const inCart = itemCount > 0;

  const discount =
    item.oldPrice && item.oldPrice > item.price
      ? Math.round(((item.oldPrice - item.price) / item.oldPrice) * 100)
      : null;

  return (
    <div className="ob-food-tile">
      <FoodCard
        name={item.name}
        description={item.description}
        price={`₹${item.price}`}
        imageUrl={item.imageUrl}
        isVeg={item.isVeg}
        action={
          inCart ? (
            <QuantityStepper
              value={Math.min(itemCount, 9)}
              label={`Quantity of ${item.name}`}
              onChange={(next) => {
                if (next > itemCount) addMockItem(item.price);
                else if (next < itemCount) removeMockItem();
              }}
            />
          ) : (
            <Button
              variant="outlined"
              size="compact"
              aria-label={`Add ${item.name} to cart`}
              onClick={() => addMockItem(item.price)}
            >
              ADD
            </Button>
          )
        }
      />
      {item.oldPrice ? (
        <div className="ob-food-tile__price-row">
          <Text variant="caption" style={{ textDecoration: 'line-through', color: 'var(--bds-color-text-secondary)' }}>
            ₹{item.oldPrice}
          </Text>
          {discount ? <Badge variant="offer">{discount}% OFF</Badge> : null}
        </div>
      ) : null}
    </div>
  );
}
