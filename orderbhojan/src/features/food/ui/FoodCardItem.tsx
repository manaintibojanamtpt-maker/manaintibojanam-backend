import { Badge, Button, QuantityStepper, Text } from '@bhojan/design-system';
import { useBlurUpImage } from '@/features/experience/hooks/useBlurUpImage';
import { MotionPress } from '@/features/experience/motion/premiumMotion';
import type { FoodPublic } from '@/types/marketplace-food';
import {
  dietaryLabel,
  formatFoodPrice,
  formatOfferLabel,
  isVegFood,
  preparationLabel,
} from '../domain/formatters';
import { useFoodPreviewStore } from '../store/foodPreviewStore';

interface FoodCardItemProps {
  readonly food: FoodPublic;
  readonly onCustomize: (food: FoodPublic) => void;
}

export function FoodCardItem({ food, onCustomize }: FoodCardItemProps) {
  const lines = useFoodPreviewStore((s) => s.lines);
  const addItem = useFoodPreviewStore((s) => s.addItem);
  const setQuantity = useFoodPreviewStore((s) => s.setQuantity);
  const line = lines.find((l) => l.foodId === food.foodId);
  const quantity = line?.quantity ?? 0;
  const offerLabel = formatOfferLabel(food);
  const hasOptions = food.variants.length > 0 || food.addons.length > 0;

  const unitPrice = food.offerPrice ?? food.price;
  const blur = useBlurUpImage();

  const handleAdd = () => {
    if (!food.availability) return;
    if (hasOptions) {
      onCustomize(food);
      return;
    }
    addItem({ foodId: food.foodId, name: food.name, unitPrice }, 1);
  };

  return (
    <article className={`ob-food-card${!food.availability ? ' ob-food-card--unavailable' : ''}`}>
      <div className="ob-food-card__media">
        {food.bestSeller ? <span className="ob-food-card__ribbon">Best Seller</span> : null}
        {!food.bestSeller && food.chefSpecial ? (
          <span className="ob-food-card__ribbon">Chef Pick</span>
        ) : null}
        {food.image ? (
          <img
            src={food.image}
            alt=""
            className={`ob-food-card__image ${blur.className}`}
            loading="lazy"
            onLoad={blur.onLoad}
          />
        ) : (
          <div className="ob-food-card__image ob-food-card__image--placeholder" aria-hidden />
        )}
        <div className="ob-food-card__badges">
          {food.bestSeller ? <Badge variant="offer">Best Seller</Badge> : null}
          {food.chefSpecial ? <Badge variant="offer">Chef Special</Badge> : null}
          {food.newItem ? <Badge variant="default">New</Badge> : null}
          {offerLabel ? <Badge variant="offer">{offerLabel}</Badge> : null}
          <Badge variant="default" className="ob-food-card__ai-badge">
            AI
          </Badge>
        </div>
      </div>

      <div className="ob-food-card__body">
        <div className="ob-food-card__title-row">
          <Badge variant={isVegFood(food) ? 'veg' : food.dietary === 'egg' ? 'default' : 'nonVeg'}>
            {dietaryLabel(food.dietary)}
          </Badge>
          <Text variant="subtitle" as="h3" className="ob-food-card__name">
            {food.name}
          </Text>
        </div>

        {food.description ? (
          <Text variant="bodySm" className="ob-food-card__description">
            {food.description}
          </Text>
        ) : null}

        <div className="ob-food-card__meta">
          {food.rating != null ? (
            <Text variant="caption">★ {food.rating.toFixed(1)}</Text>
          ) : null}
          {preparationLabel(food.preparationTime) ? (
            <Text variant="caption">{preparationLabel(food.preparationTime)}</Text>
          ) : null}
          {!food.availability ? (
            <Text variant="caption" className="ob-food-card__sold-out">
              Unavailable
            </Text>
          ) : null}
        </div>

        <div className="ob-food-card__footer">
          <div className="ob-food-card__price">
            <Text variant="price">{formatFoodPrice(food)}</Text>
            {food.offerPrice && food.offerPrice < food.price ? (
              <Text variant="caption" className="ob-food-card__strike">
                ₹{food.price}
              </Text>
            ) : null}
          </div>

          {quantity > 0 ? (
            <QuantityStepper
              value={quantity}
              onChange={(next) => setQuantity(food.foodId, next)}
              label={`Quantity for ${food.name}`}
            />
          ) : (
            <MotionPress>
              <Button
                variant="primary"
                size="compact"
                className="ob-food-card__add"
                disabled={!food.availability}
                aria-label={`Add ${food.name}`}
                onClick={handleAdd}
              >
                Add
              </Button>
            </MotionPress>
          )}
        </div>
      </div>
    </article>
  );
}
