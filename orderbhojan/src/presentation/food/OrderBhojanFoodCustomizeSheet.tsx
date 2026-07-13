import { useMemo, useState } from 'react';
import BottomSheet from '@bhojan/storefront-design-system/layout/BottomSheet';
import { FoodCustomizationPanelView } from '@bhojan/storefront-design-system/food/FoodCustomizationPanelView';
import type { FoodAddon, FoodPublic, FoodVariant } from '@/types/marketplace-food';
import { resolveFoodItemPhoto } from '@/features/food/data/food-item-photo-manifest';
import { formatFoodPrice, spiceLabel } from '@/features/food/domain/formatters';
import { useFoodPreviewStore } from '@/features/food/store/foodPreviewStore';
import { mapFoodToCustomizationStory } from './mapFoodToCustomizationStory';

export interface OrderBhojanFoodCustomizeSheetProps {
  readonly food: FoodPublic | null;
  readonly open: boolean;
  readonly onClose: () => void;
}

function OrderBhojanFoodCustomizeSheetBody({
  food,
  onClose,
}: {
  readonly food: FoodPublic;
  readonly onClose: () => void;
}) {
  const addItem = useFoodPreviewStore((s) => s.addItem);
  const [variant, setVariant] = useState<FoodVariant | null>(null);
  const [addons, setAddons] = useState<readonly FoodAddon[]>([]);
  const [instructions, setInstructions] = useState('');
  const [quantity, setQuantity] = useState(1);

  const selectedVariant = variant ?? food.variants[0] ?? null;
  const basePrice =
    selectedVariant?.offerPrice ?? selectedVariant?.price ?? food.offerPrice ?? food.price;
  const addonTotal = addons.reduce((sum, addon) => sum + addon.price, 0);
  const unitPrice = basePrice + addonTotal;
  const lineTotal = unitPrice * quantity;
  const photo = resolveFoodItemPhoto(food.foodId, 640, '100vw', 82);

  const toggleAddon = (addonId: string) => {
    const addon = food.addons.find((entry) => entry.id === addonId);
    if (!addon) return;
    setAddons((current) => {
      const exists = current.some((entry) => entry.id === addon.id);
      if (exists) return current.filter((entry) => entry.id !== addon.id);
      return [...current, addon];
    });
  };

  const confirm = () => {
    addItem(
      {
        foodId: food.foodId,
        name: food.name,
        unitPrice,
        variantId: selectedVariant?.id,
        variantLabel: selectedVariant?.label,
        addons:
          addons.length > 0
            ? addons.map((addon) => ({
                id: addon.id,
                label: addon.label,
                price: addon.price,
              }))
            : undefined,
        instructions: instructions.trim() || undefined,
      },
      quantity,
    );
    onClose();
  };

  const model = useMemo(() => {
    const variantOptions = food.variants.map((option) => ({
      id: option.id,
      label: option.label,
      priceLabel: formatFoodPrice(food, option.offerPrice ?? option.price),
      selected: selectedVariant?.id === option.id,
    }));

    return {
      heroBlurUrl: photo.blurDataURL || undefined,
      story: mapFoodToCustomizationStory(food),
      variantOptions,
      variantMode: variantOptions.length <= 4 ? ('segment' as const) : ('list' as const),
      variantSectionTitle: 'Size',
      showVariantSection: food.variants.length > 0,
      addonOptions: food.addons.map((addon) => ({
        id: addon.id,
        label: addon.label,
        priceLabel: addon.price ? `+₹${addon.price}` : 'Free',
        selected: addons.some((entry) => entry.id === addon.id),
      })),
      addonSectionTitle: 'Add-ons',
      showAddonSection: food.addons.length > 0,
      quantity,
      quantityAriaLabel: `Quantity for ${food.name}`,
      spiceNote: spiceLabel(food.spiceLevel) ?? undefined,
      instructions,
      instructionsPlaceholder: 'Less spicy, no onion, etc.',
      unitPriceSummary: `${quantity} × ₹${unitPrice}`,
      lineTotalLabel: `₹${lineTotal}`,
      confirmLabel: 'Add to cart',
    };
  }, [addons, food, instructions, lineTotal, photo.blurDataURL, quantity, selectedVariant?.id, unitPrice]);

  return (
    <FoodCustomizationPanelView
      model={model}
      onSelectVariant={(id) => {
        const next = food.variants.find((option) => option.id === id);
        if (next) setVariant(next);
      }}
      onToggleAddon={toggleAddon}
      onQuantityChange={setQuantity}
      onInstructionsChange={setInstructions}
      onConfirm={confirm}
    />
  );
}

export function OrderBhojanFoodCustomizeSheet({
  food,
  open,
  onClose,
}: OrderBhojanFoodCustomizeSheetProps) {
  if (!food) return null;

  return (
    <BottomSheet
      isOpen={open}
      onClose={onClose}
      title={food.name}
      panelClassName="!bg-[#0d0d0d] !text-white border-t border-white/10"
      snapPoints={[92]}
    >
      <OrderBhojanFoodCustomizeSheetBody key={food.foodId} food={food} onClose={onClose} />
    </BottomSheet>
  );
}
