import type { FoodPublic } from '@/types/marketplace-food';
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
    <section id={id} aria-label={title} className="ob-menu-section w-full min-w-0 bg-[#030303] py-6">
      <div className="ob-menu-container">
        <SectionHeader title={title} align="left" className="!mb-4 !text-left" />
        <div className="ob-menu-card-list flex w-full min-w-0 flex-col rounded-2xl border border-white/10 bg-[#151515]">
          {items.map((food, index) => (
            <OrderBhojanFoodCardItem key={food.foodId} food={food} onCustomize={onCustomize} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
