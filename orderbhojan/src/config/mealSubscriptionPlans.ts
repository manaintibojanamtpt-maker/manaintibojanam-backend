export type MealPreference = 'veg' | 'egg' | 'nonveg';
export type DeliverySlot = 'lunch' | 'dinner' | 'both';

export interface MealSubscriptionPlan {
  readonly id: '1_meal' | '2_meals' | 'premium';
  readonly title: string;
  readonly price: number;
  readonly mealsPerDay: number;
  readonly description: string;
  readonly popular?: boolean;
}

export const MEAL_SUBSCRIPTION_PLANS: readonly MealSubscriptionPlan[] = [
  {
    id: '1_meal',
    title: '1 Meal / Day',
    price: 3000,
    mealsPerDay: 1,
    description: 'Perfect for working professionals',
  },
  {
    id: '2_meals',
    title: '2 Meals / Day',
    price: 5500,
    mealsPerDay: 2,
    description: 'Most popular for complete daily nutrition',
    popular: true,
  },
  {
    id: 'premium',
    title: '3 Meals / Day',
    price: 6500,
    mealsPerDay: 3,
    description: 'Complete hassle-free dining all month',
  },
] as const;

export function weeklyPlanForPreference(pref: MealPreference) {
  switch (pref) {
    case 'veg':
      return { vegDays: 7, eggDays: 0, nonVegDays: 0 };
    case 'egg':
      return { vegDays: 4, eggDays: 3, nonVegDays: 0 };
    case 'nonveg':
      return { vegDays: 3, eggDays: 2, nonVegDays: 2 };
    default:
      return { vegDays: 7, eggDays: 0, nonVegDays: 0 };
  }
}
