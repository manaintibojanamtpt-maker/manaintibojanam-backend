import { memo, useState, type MouseEvent } from 'react';
import { Minus, Plus } from 'lucide-react';
import { MenuItemCardView } from '@bhojan/storefront-design-system/food/MenuItemCardView';
import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';
import type { FoodPublic } from '@/types/marketplace-food';
import { useCartStore, buildCartLineId } from '@/features/cart/store/cartStore';
import { mapFoodToMenuItemCardView } from './mapFoodToMenuItemCardView';

function selectLineQuantity(lineId: string) {
  return (state: ReturnType<typeof useCartStore.getState>) => {
    for (const line of state.lines) {
      if (line.lineId === lineId) return line.quantity;
    }
    return 0;
  };
}

const FoodCartQuantitySelector = memo(function FoodCartQuantitySelector({
  lineId,
  foodName,
  hasOptions,
  unitPrice,
  foodId,
  food,
  onCustomize,
}: {
  readonly lineId: string;
  readonly foodName: string;
  readonly hasOptions: boolean;
  readonly unitPrice: number;
  readonly foodId: string;
  readonly onCustomize: (food: FoodPublic) => void;
  readonly food: FoodPublic;
}) {
  const quantity = useCartStore(selectLineQuantity(lineId));
  const addItem = useCartStore((s) => s.addItem);
  const setQuantity = useCartStore((s) => s.setQuantity);

  return (
    <div className="flex h-10 w-full items-center justify-between rounded-full border border-[#FF7A00]/30 bg-[#2A1A12] px-1.5 shadow-sm">
      <button
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 touch-manipulation"
        aria-label={`Decrease quantity of ${foodName}`}
        onClick={(e) => {
          e.stopPropagation();
          setQuantity(lineId, quantity - 1);
        }}
      >
        <Minus className="h-4 w-4 text-[#F4C27A]" strokeWidth={3} aria-hidden />
      </button>
      <span className="min-w-[1.5rem] text-center text-sm font-black tabular-nums text-white">{quantity}</span>
      <button
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 touch-manipulation"
        aria-label={`Increase quantity of ${foodName}`}
        onClick={(e) => {
          e.stopPropagation();
          if (hasOptions) onCustomize(food);
          else addItem({ foodId, name: foodName, price: unitPrice }, 1);
        }}
      >
        <Plus className="h-4 w-4 text-[#F4C27A]" strokeWidth={3} aria-hidden />
      </button>
    </div>
  );
});

export interface OrderBhojanFoodCardItemProps {
  readonly food: FoodPublic;
  readonly onCustomize: (food: FoodPublic) => void;
  readonly priority?: boolean;
  readonly index?: number;
}

export const OrderBhojanFoodCardItem = memo(function OrderBhojanFoodCardItem({
  food,
  onCustomize,
  priority = false,
  index = 0,
}: OrderBhojanFoodCardItemProps) {
  const lineId = buildCartLineId({ foodId: food.foodId });
  const quantity = useCartStore(selectLineQuantity(lineId));
  const addItem = useCartStore((s) => s.addItem);
  const [fly, setFly] = useState(false);

  const hasOptions = food.variants.length > 0 || food.addons.length > 0;
  const unitPrice = food.offerPrice ?? food.price;
  const viewModel = mapFoodToMenuItemCardView(food);

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

  const actionSlot =
    quantity > 0 ? (
      <FoodCartQuantitySelector
        lineId={lineId}
        foodName={food.name}
        hasOptions={hasOptions}
        unitPrice={unitPrice}
        foodId={food.foodId}
        food={food}
        onCustomize={onCustomize}
      />
    ) : (
      <SoftButton
        type="button"
        size="compact"
        className={`w-full !rounded-full !py-2 !text-xs !font-black !uppercase !tracking-widest${fly ? ' scale-95' : ''}`}
        disabled={!food.availability}
        onClick={(e: MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation();
          handleAdd();
        }}
        aria-label={`Add ${food.name}`}
      >
        Add
      </SoftButton>
    );

  return (
    <MenuItemCardView
      item={viewModel}
      actionSlot={actionSlot}
      index={index}
      imagePriority={priority}
      onPress={hasOptions ? () => onCustomize(food) : undefined}
    />
  );
});
