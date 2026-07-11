import { useState, type MouseEvent } from 'react';
import { Minus, Plus } from 'lucide-react';
import { MenuItemCardView } from '@bhojan/storefront-design-system/food/MenuItemCardView';
import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';
import type { FoodPublic } from '@/types/marketplace-food';
import { useCartStore, buildCartLineId } from '@/features/cart/store/cartStore';
import { mapFoodToMenuItemCardView } from './mapFoodToMenuItemCardView';

export interface OrderBhojanFoodCardItemProps {
  readonly food: FoodPublic;
  readonly onCustomize: (food: FoodPublic) => void;
  readonly priority?: boolean;
  readonly index?: number;
}

export function OrderBhojanFoodCardItem({
  food,
  onCustomize,
  priority = false,
  index = 0,
}: OrderBhojanFoodCardItemProps) {
  const lineId = buildCartLineId({ foodId: food.foodId });
  const quantity = useCartStore((s) => s.lines.find((l) => l.lineId === lineId)?.quantity ?? 0);
  const addItem = useCartStore((s) => s.addItem);
  const setQuantity = useCartStore((s) => s.setQuantity);
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
      <div className="flex h-10 w-full items-center justify-between rounded-full border border-[#FF7A00]/30 bg-[#2A1A12] px-1.5 shadow-sm">
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/10"
          aria-label={`Decrease quantity of ${food.name}`}
          onClick={(e) => {
            e.stopPropagation();
            setQuantity(lineId, quantity - 1);
          }}
        >
          <Minus className="h-3.5 w-3.5 text-[#F4C27A]" strokeWidth={3} aria-hidden />
        </button>
        <span className="text-sm font-black tabular-nums text-white">{quantity}</span>
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/10"
          aria-label={`Increase quantity of ${food.name}`}
          onClick={(e) => {
            e.stopPropagation();
            if (hasOptions) onCustomize(food);
            else addItem({ foodId: food.foodId, name: food.name, price: unitPrice }, 1);
          }}
        >
          <Plus className="h-3.5 w-3.5 text-[#F4C27A]" strokeWidth={3} aria-hidden />
        </button>
      </div>
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
}
