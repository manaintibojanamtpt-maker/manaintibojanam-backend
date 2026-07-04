import { useState } from 'react';
import { Badge, BottomSheet, Button, Text } from '@bhojan/design-system';
import type { FoodAddon, FoodPublic, FoodVariant } from '@/types/marketplace-food';
import { formatFoodPrice } from '../domain/formatters';
import { useFoodPreviewStore } from '../store/foodPreviewStore';

interface FoodCustomizeSheetProps {
  readonly food: FoodPublic | null;
  readonly open: boolean;
  readonly onClose: () => void;
}

export function FoodCustomizeSheet({ food, open, onClose }: FoodCustomizeSheetProps) {
  const addItem = useFoodPreviewStore((s) => s.addItem);
  const [variant, setVariant] = useState<FoodVariant | null>(null);
  const [addons, setAddons] = useState<readonly FoodAddon[]>([]);
  const [instructions, setInstructions] = useState('');

  if (!food) return null;

  const selectedVariant = variant ?? food.variants[0] ?? null;
  const basePrice = selectedVariant?.offerPrice ?? selectedVariant?.price ?? food.offerPrice ?? food.price;
  const addonTotal = addons.reduce((sum, addon) => sum + addon.price, 0);
  const unitPrice = basePrice + addonTotal;

  const toggleAddon = (addon: FoodAddon) => {
    setAddons((current) => {
      const exists = current.some((a) => a.id === addon.id);
      if (exists) return current.filter((a) => a.id !== addon.id);
      return [...current, addon];
    });
  };

  const resetAndClose = () => {
    setVariant(null);
    setAddons([]);
    setInstructions('');
    onClose();
  };

  const confirm = () => {
    addItem({ foodId: food.foodId, name: food.name, unitPrice }, 1);
    resetAndClose();
  };

  return (
    <BottomSheet open={open} onClose={resetAndClose} title={food.name}>
      {food.variants.length > 0 ? (
        <section className="ob-food-sheet__section" aria-label="Choose size">
          <Text variant="subtitle" as="h3">
            Size
          </Text>
          <div className="ob-food-sheet__options">
            {food.variants.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`ob-food-sheet__option${
                  selectedVariant?.id === option.id ? ' ob-food-sheet__option--active' : ''
                }`}
                onClick={() => setVariant(option)}
              >
                <span>{option.label}</span>
                <Text variant="price">{formatFoodPrice(food, option.offerPrice ?? option.price)}</Text>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {food.addons.length > 0 ? (
        <section className="ob-food-sheet__section" aria-label="Add-ons">
          <Text variant="subtitle" as="h3">
            Add-ons
          </Text>
          <div className="ob-food-sheet__options">
            {food.addons.map((addon) => {
              const selected = addons.some((a) => a.id === addon.id);
              return (
                <button
                  key={addon.id}
                  type="button"
                  className={`ob-food-sheet__option${selected ? ' ob-food-sheet__option--active' : ''}`}
                  onClick={() => toggleAddon(addon)}
                >
                  <span>{addon.label}</span>
                  <Badge variant="offer">{addon.price ? `+₹${addon.price}` : 'Free'}</Badge>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="ob-food-sheet__section" aria-label="Special instructions">
        <Text variant="subtitle" as="h3">
          Special instructions
        </Text>
        <textarea
          className="ob-food-sheet__textarea"
          rows={3}
          placeholder="Less spicy, no onion, etc."
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
        />
      </section>

      <div className="ob-food-sheet__footer">
        <Text variant="price">₹{unitPrice}</Text>
        <Button variant="primary" onClick={confirm}>
          Add to preview
        </Button>
      </div>
    </BottomSheet>
  );
}
