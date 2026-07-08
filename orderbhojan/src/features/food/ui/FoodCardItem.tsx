import { Badge, QuantityStepper, Text, FoodRow, FoodRowAddButton, MotionPress } from '@bhojan/design-system';
import { useState } from 'react';
import type { FoodPublic } from '@/types/marketplace-food';
import { useCartStore, buildCartLineId } from '@/features/cart/store/cartStore';
import { resolveFoodItemPhoto } from '../data/food-item-photo-manifest';
import {
  resolveFoodLabelBadges,
  resolveOfferDisplayText,
} from '../domain/contractPresentation';
import {
  dietaryLabel,
  formatFoodPrice,
  isVegFood,
  preparationLabel,
  ratingLabel,
  spiceLabel,
} from '../domain/formatters';

interface FoodCardItemProps {
  readonly food: FoodPublic;
  readonly onCustomize: (food: FoodPublic) => void;
  readonly priority?: boolean;
}

export function FoodCardItem({ food, onCustomize, priority = false }: FoodCardItemProps) {
  const lineId = buildCartLineId({ foodId: food.foodId });
  const quantity = useCartStore(
    (s) => s.lines.find((l) => l.lineId === lineId)?.quantity ?? 0,
  );
  const addItem = useCartStore((s) => s.addItem);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const [fly, setFly] = useState(false);
  const offerLabel = resolveOfferDisplayText(food);
  const labelBadges = resolveFoodLabelBadges(food);
  const hasOptions = food.variants.length > 0 || food.addons.length > 0;
  const unitPrice = food.offerPrice ?? food.price;
  const photo = food.image?.trim()
    ? {
        src: food.image.trim(),
        srcSet: '',
        sizes: '8.5rem',
        blurDataURL: '',
        sources: [{ srcSet: food.image.trim(), type: 'image/jpeg' as const }],
        preloadHref: food.image.trim(),
      }
    : resolveFoodItemPhoto(food.foodId, 480, '8.5rem', 82);

  const triggerFly = () => {
    setFly(true);
    window.setTimeout(() => setFly(false), 520);
  };

  const handleAdd = () => {
    if (!food.availability) return;
    if (hasOptions) {
      onCustomize(food);
      return;
    }
    triggerFly();
    addItem({ foodId: food.foodId, name: food.name, price: unitPrice }, 1);
  };

  const badge = (
    <>
      {labelBadges.map((label) => (
        <Badge key={label.displayText} variant="offer">
          {label.displayText}
        </Badge>
      ))}
      {offerLabel ? <Badge variant="offer">{offerLabel}</Badge> : null}
      <Badge variant={isVegFood(food) ? 'veg' : food.dietary === 'egg' ? 'default' : 'nonVeg'}>
        {dietaryLabel(food.dietary)}
      </Badge>
    </>
  );

  const meta = (
    <>
      {ratingLabel(food.rating) ? <span>{ratingLabel(food.rating)}</span> : null}
      {spiceLabel(food.spiceLevel) ? <span>{spiceLabel(food.spiceLevel)}</span> : null}
      {preparationLabel(food.preparationTime) ? <span>{preparationLabel(food.preparationTime)}</span> : null}
      {!food.availability ? (
        <Text variant="caption" style={{ color: 'var(--bds-color-danger, #c0392b)' }}>
          Sold out
        </Text>
      ) : null}
    </>
  );

  const action =
    quantity > 0 ? (
      <QuantityStepper
        value={quantity}
        onChange={(next) => setQuantity(lineId, next)}
        label={`Quantity for ${food.name}`}
      />
    ) : (
      <MotionPress>
        <FoodRowAddButton
          label="Add"
          disabled={!food.availability}
          className={fly ? 'ob-food-px6__add--fly' : undefined}
          onClick={(e) => {
            e.stopPropagation();
            handleAdd();
          }}
          aria-label={`Add ${food.name}`}
        />
      </MotionPress>
    );

  return (
    <FoodRow
      name={food.name}
      description={food.description}
      price={formatFoodPrice(food)}
      imageUrl={photo.src}
      imageSrcSet={photo.srcSet}
      imageSizes={photo.sizes}
      imageBlurDataURL={photo.blurDataURL}
      imageSources={photo.sources}
      imagePriority={priority}
      imageAlt={food.name}
      badge={badge}
      meta={meta}
      action={action}
      density="editorial"
      className="ob-food-px6__row"
      onPress={hasOptions ? () => onCustomize(food) : undefined}
    />
  );
}
