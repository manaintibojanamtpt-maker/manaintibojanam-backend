import { Text } from '@bhojan/design-system';
import type { FoodPublic } from '@/types/marketplace-food';

interface FoodStoryPanelProps {
  readonly food: FoodPublic;
}

export function FoodStoryPanel({ food }: FoodStoryPanelProps) {
  const hasStory =
    food.chefNote ||
    (food.ingredients && food.ingredients.length > 0) ||
    food.cookingStyle ||
    food.servingSize ||
    food.popularPairing ||
    (food.dietaryLabels && food.dietaryLabels.length > 0);

  if (!hasStory) return null;

  return (
    <section className="ob-food-px6__story" aria-label="About this dish">
      {food.chefNote ? (
        <blockquote className="ob-food-px6__story-note">
          <Text variant="bodySm">{food.chefNote}</Text>
        </blockquote>
      ) : null}
      <dl className="ob-food-px6__story-details">
        {food.cookingStyle ? (
          <>
            <dt>Cooking style</dt>
            <dd>{food.cookingStyle}</dd>
          </>
        ) : null}
        {food.servingSize ? (
          <>
            <dt>Serving</dt>
            <dd>{food.servingSize}</dd>
          </>
        ) : null}
        {food.popularPairing ? (
          <>
            <dt>Pairs well with</dt>
            <dd>{food.popularPairing}</dd>
          </>
        ) : null}
        {food.ingredients && food.ingredients.length > 0 ? (
          <>
            <dt>Key ingredients</dt>
            <dd>{food.ingredients.join(', ')}</dd>
          </>
        ) : null}
        {food.dietaryLabels && food.dietaryLabels.length > 0 ? (
          <>
            <dt>Labels</dt>
            <dd>{food.dietaryLabels.join(' · ')}</dd>
          </>
        ) : null}
      </dl>
    </section>
  );
}
