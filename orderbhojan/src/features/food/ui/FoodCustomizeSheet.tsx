import { useState } from 'react';
import { Badge, BottomSheet, Button, QuantityStepper, SegmentedControl, Text } from '@bhojan/design-system';
import type { FoodAddon, FoodPublic, FoodVariant } from '@/types/marketplace-food';
import { resolveFoodItemPhoto } from '../data/food-item-photo-manifest';
import { formatFoodPrice, spiceLabel } from '../domain/formatters';
import { useFoodPreviewStore } from '../store/foodPreviewStore';
import { FoodStoryPanel } from './FoodStoryPanel';

interface FoodCustomizeSheetProps {
  readonly food: FoodPublic | null;
  readonly open: boolean;
  readonly onClose: () => void;
}

function FoodCustomizeSheetBody({
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
  const variantSegments = food.variants.map((option) => ({
    id: option.id,
    label: option.label,
  }));

  const toggleAddon = (addon: FoodAddon) => {
    setAddons((current) => {
      const exists = current.some((a) => a.id === addon.id);
      if (exists) return current.filter((a) => a.id !== addon.id);
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
        addons: addons.length > 0 ? addons.map((addon) => ({
          id: addon.id,
          label: addon.label,
          price: addon.price,
        })) : undefined,
        instructions: instructions.trim() || undefined,
      },
      quantity,
    );
    onClose();
  };

  return (
    <>
      <div
        className="ob-food-px6__sheet-hero"
        style={{
          backgroundImage: photo.blurDataURL ? `url(${photo.blurDataURL})` : undefined,
        }}
        aria-hidden
      />

      <FoodStoryPanel food={food} />

      {food.variants.length > 0 ? (
        <section className="ob-food-sheet__section" aria-label="Choose size">
          <Text variant="subtitle" as="h3">
            Size
          </Text>
          {variantSegments.length <= 4 ? (
            <SegmentedControl
              items={variantSegments}
              activeId={selectedVariant?.id ?? variantSegments[0]?.id ?? ''}
              onChange={(id) => {
                const next = food.variants.find((option) => option.id === id);
                if (next) setVariant(next);
              }}
              ariaLabel="Choose size"
              fullWidth
            />
          ) : (
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
          )}
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

      <section className="ob-food-sheet__section" aria-label="Quantity">
        <Text variant="subtitle" as="h3">
          Quantity
        </Text>
        <QuantityStepper
          value={quantity}
          onChange={setQuantity}
          label={`Quantity for ${food.name}`}
          min={1}
        />
      </section>

      {spiceLabel(food.spiceLevel) ? (
        <Text variant="caption" className="ob-food-px6__sheet-spice">
          {spiceLabel(food.spiceLevel)}
        </Text>
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

      <div className="ob-food-sheet__footer ob-food-px6__sheet-footer">
        <div className="ob-food-px6__sheet-total">
          <Text variant="caption" style={{ color: 'var(--bds-color-text-secondary)' }}>
            {quantity} × ₹{unitPrice}
          </Text>
          <Text variant="price" className="ob-food-px6__sheet-price" aria-live="polite">
            ₹{lineTotal}
          </Text>
        </div>
        <Button variant="primary" onClick={confirm} className="ob-food-px6__sheet-confirm">
          Add to preview
        </Button>
      </div>
    </>
  );
}

export function FoodCustomizeSheet({ food, open, onClose }: FoodCustomizeSheetProps) {
  if (!food) return null;

  return (
    <BottomSheet open={open} onClose={onClose} title={food.name} className="ob-food-px6__sheet">
      <FoodCustomizeSheetBody key={food.foodId} food={food} onClose={onClose} />
    </BottomSheet>
  );
}
