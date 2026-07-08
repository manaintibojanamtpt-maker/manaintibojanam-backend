import type { Meta, StoryObj } from '@storybook/react';
import { RestaurantCard } from '../RestaurantCard';
import { FoodCard } from '../FoodCard';
import { OfferCard } from '../OfferCard';
import { MetricCard } from '../Navigation';
import { QuantityStepper } from '../QuantityStepper';

const meta: Meta = {
  title: 'Marketplace/RestaurantCard',
  tags: ['autodocs'],
};

export default meta;

export const Restaurant: StoryObj = {
  render: () => (
    <div style={{ maxWidth: 320 }}>
      <RestaurantCard name="Mana Inti Bojanam" cuisine="Andhra · South Indian" rating={4.6} eta="25 min" offer="50% OFF" />
    </div>
  ),
};

export const Food: StoryObj = {
  render: () => (
    <FoodCard
      name="Gongura Chicken Biryani"
      description="Slow-cooked with fresh gongura leaves"
      price="₹249"
      isVeg={false}
      action={<QuantityStepper value={1} onChange={() => undefined} />}
    />
  ),
};

export const Offer: StoryObj = {
  render: () => <OfferCard title="Free delivery" subtitle="On orders above ₹299" code="BHOJAN299" />,
};

export const Metric: StoryObj = {
  render: () => <MetricCard label="Today's Revenue" value="₹42,580" hint="+12% vs yesterday" />,
};
