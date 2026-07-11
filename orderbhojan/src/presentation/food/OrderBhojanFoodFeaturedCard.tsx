import { useState, type MouseEvent } from 'react';
import { FeaturedMenuItemCardView } from '@bhojan/storefront-design-system/food/FeaturedMenuItemCardView';
import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';
import type { FoodPublic } from '@/types/marketplace-food';
import { useFoodPreviewStore } from '@/features/food/store/foodPreviewStore';
import { mapFoodToFeaturedCardView } from './mapFoodToMenuItemCardView';

export interface OrderBhojanFoodFeaturedCardProps {
  readonly food: FoodPublic;
  readonly onCustomize: (food: FoodPublic) => void;
  readonly priority?: boolean;
}

export function OrderBhojanFoodFeaturedCard({
  food,
  onCustomize,
  priority = false,
}: OrderBhojanFoodFeaturedCardProps) {
  const addItem = useFoodPreviewStore((s) => s.addItem);
  const [fly, setFly] = useState(false);
  const hasOptions = food.variants.length > 0 || food.addons.length > 0;
  const viewModel = mapFoodToFeaturedCardView(food);

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
    <div className={fly ? 'scale-95 transition-transform' : undefined}>
      <FeaturedMenuItemCardView
        item={viewModel}
        imagePriority={priority}
        onPress={hasOptions ? () => onCustomize(food) : undefined}
        actionSlot={
          <SoftButton
            type="button"
            size="compact"
            className="!rounded-full !px-3 !py-1 !text-[10px] !font-black !uppercase"
            disabled={!food.availability}
            onClick={handleAdd}
            aria-label={`Add ${food.name}`}
          >
            Add
          </SoftButton>
        }
      />
    </div>
  );
}
