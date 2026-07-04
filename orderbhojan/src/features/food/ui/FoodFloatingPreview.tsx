import { Button, FloatingCart, Text } from '@bhojan/design-system';
import {
  foodPreviewCount,
  foodPreviewTotal,
  useFoodPreviewStore,
} from '../store/foodPreviewStore';

export function FoodFloatingPreview() {
  const lines = useFoodPreviewStore((s) => s.lines);
  const visible = useFoodPreviewStore((s) => s.visible);

  if (!visible || lines.length === 0) return null;

  const count = foodPreviewCount(lines);
  const total = foodPreviewTotal(lines);

  return (
    <div className="ob-food-preview" role="status" aria-live="polite">
      <FloatingCart
        itemCount={count}
        total={`₹${total}`}
        label="Cart preview"
        onCheckout={() => undefined}
        className="ob-food-preview__bar"
      />
      <Text variant="caption" className="ob-food-preview__hint">
        Preview only — checkout arrives in M7
      </Text>
      <Button
        variant="secondary"
        size="compact"
        className="ob-food-preview__clear"
        onClick={() => useFoodPreviewStore.getState().clear()}
      >
        Clear preview
      </Button>
    </div>
  );
}
