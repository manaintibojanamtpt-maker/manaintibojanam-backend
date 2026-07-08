import { Badge, DishPoster, DishPosterAddButton, MotionPress, Text } from '@bhojan/design-system';
import { useState, type MouseEvent } from 'react';
import type { FoodPublic } from '@/types/marketplace-food';
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
} from '../domain/formatters';
import { useFoodPreviewStore } from '../store/foodPreviewStore';

interface FoodFeaturedPosterProps {
  readonly food: FoodPublic;
  readonly onCustomize: (food: FoodPublic) => void;
  readonly priority?: boolean;
}

export function FoodFeaturedPoster({ food, onCustomize, priority = false }: FoodFeaturedPosterProps) {
  const addItem = useFoodPreviewStore((s) => s.addItem);
  const [fly, setFly] = useState(false);
  const photo = resolveFoodItemPhoto(food.foodId, 640, '42vw', 82);
  const hasOptions = food.variants.length > 0 || food.addons.length > 0;
  const offerLabel = resolveOfferDisplayText(food);
  const labelBadges = resolveFoodLabelBadges(food);

  const handleAdd = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!food.availability) return;
    if (hasOptions) {
      onCustomize(food);
      return;
    }
    setFly(true);
    window.setTimeout(() => setFly(false), 520);
    addItem({ foodId: food.foodId, name: food.name, unitPrice: food.offerPrice ?? food.price }, 1);
  };

  return (
    <div className={`ob-food-px6__poster-wrap${fly ? ' ob-food-px6__poster-wrap--fly' : ''}`}>
      <MotionPress>
        <DishPoster
          name={food.name}
          price={formatFoodPrice(food)}
          imageUrl={photo.src}
          imageSrcSet={photo.srcSet}
          imageSizes={photo.sizes}
          imageBlurDataURL={photo.blurDataURL}
          imageSources={photo.sources}
          imageAlt={food.name}
          imagePriority={priority}
          className="ob-food-px6__poster"
          onPress={() => (hasOptions ? onCustomize(food) : undefined)}
          addAction={
            <DishPosterAddButton
              aria-label={`Add ${food.name}`}
              disabled={!food.availability}
              onClick={handleAdd}
            />
          }
        />
      </MotionPress>
      <div className="ob-food-px6__poster-badges">
        {labelBadges.map((label) => (
          <Badge key={label.displayText} variant="offer">
            {label.displayText}
          </Badge>
        ))}
        {offerLabel ? <Badge variant="offer">{offerLabel}</Badge> : null}
        <Badge variant={isVegFood(food) ? 'veg' : food.dietary === 'egg' ? 'default' : 'nonVeg'}>
          {dietaryLabel(food.dietary)}
        </Badge>
        {ratingLabel(food.rating) ? (
          <Text variant="caption" className="ob-food-px6__poster-meta">
            {ratingLabel(food.rating)}
          </Text>
        ) : null}
        {preparationLabel(food.preparationTime) ? (
          <Text variant="caption" className="ob-food-px6__poster-meta">
            {preparationLabel(food.preparationTime)}
          </Text>
        ) : null}
      </div>
    </div>
  );
}
