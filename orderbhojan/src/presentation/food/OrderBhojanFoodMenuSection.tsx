import type { FoodPublic } from '@/types/marketplace-food';
import { Section } from '@bhojan/storefront-design-system/primitives/Section';
import { SectionHeader } from '@bhojan/storefront-design-system/primitives/SectionHeader';
import { OrderBhojanFoodCardItem } from './OrderBhojanFoodCardItem';

export interface OrderBhojanFoodMenuSectionProps {
  readonly id: string;
  readonly title: string;
  readonly items: readonly FoodPublic[];
  readonly onCustomize: (food: FoodPublic) => void;
}

export function OrderBhojanFoodMenuSection({
  id,
  title,
  items,
  onCustomize,
}: OrderBhojanFoodMenuSectionProps) {
  if (items.length === 0) return null;

  return (
    <Section density="comfortable" background="default" className="!py-6" id={id} aria-labelledby={`${id}-title`}>
      <div className="mx-auto max-w-3xl px-4">
        <SectionHeader title={title} align="left" className="!mb-4 !text-left" />
        <div className="overflow-hidden rounded-2xl border border-white/10">
          {items.map((food, index) => (
            <OrderBhojanFoodCardItem key={food.foodId} food={food} onCustomize={onCustomize} index={index} />
          ))}
        </div>
      </div>
    </Section>
  );
}
