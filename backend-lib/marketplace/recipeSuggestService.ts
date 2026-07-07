export type SuggestedIngredient = {
  name: string;
  quantity: number;
  unit: string;
};

const TEMPLATE_MATCHERS: Array<{
  pattern: RegExp;
  ingredients: SuggestedIngredient[];
}> = [
  {
    pattern: /biryani/i,
    ingredients: [
      { name: 'Rice', quantity: 250, unit: 'gm' },
      { name: 'Chicken', quantity: 200, unit: 'gm' },
      { name: 'Oil', quantity: 30, unit: 'ml' },
      { name: 'Salt', quantity: 5, unit: 'gm' },
      { name: 'Masala', quantity: 20, unit: 'gm' },
      { name: 'Curd', quantity: 40, unit: 'gm' },
      { name: 'Mint', quantity: 10, unit: 'gm' },
      { name: 'Onion', quantity: 50, unit: 'gm' },
    ],
  },
  {
    pattern: /butter\s*chicken/i,
    ingredients: [
      { name: 'Chicken', quantity: 250, unit: 'gm' },
      { name: 'Butter', quantity: 40, unit: 'gm' },
      { name: 'Tomato', quantity: 120, unit: 'gm' },
      { name: 'Cream', quantity: 60, unit: 'ml' },
      { name: 'Masala', quantity: 15, unit: 'gm' },
      { name: 'Oil', quantity: 20, unit: 'ml' },
    ],
  },
  {
    pattern: /dosa/i,
    ingredients: [
      { name: 'Rice', quantity: 150, unit: 'gm' },
      { name: 'Urad Dal', quantity: 50, unit: 'gm' },
      { name: 'Oil', quantity: 15, unit: 'ml' },
      { name: 'Salt', quantity: 3, unit: 'gm' },
    ],
  },
  {
    pattern: /fried\s*rice/i,
    ingredients: [
      { name: 'Rice', quantity: 200, unit: 'gm' },
      { name: 'Vegetables', quantity: 80, unit: 'gm' },
      { name: 'Oil', quantity: 25, unit: 'ml' },
      { name: 'Soy Sauce', quantity: 15, unit: 'ml' },
    ],
  },
  {
    pattern: /thali/i,
    ingredients: [
      { name: 'Rice', quantity: 200, unit: 'gm' },
      { name: 'Dal', quantity: 120, unit: 'gm' },
      { name: 'Vegetables', quantity: 100, unit: 'gm' },
      { name: 'Curd', quantity: 80, unit: 'gm' },
      { name: 'Oil', quantity: 20, unit: 'ml' },
    ],
  },
  {
    pattern: /lassi|shake|juice|coffee|tea/i,
    ingredients: [
      { name: 'Milk', quantity: 200, unit: 'ml' },
      { name: 'Sugar', quantity: 15, unit: 'gm' },
    ],
  },
  {
    pattern: /dessert|sweet|halwa|kheer|ice\s*cream/i,
    ingredients: [
      { name: 'Milk', quantity: 200, unit: 'ml' },
      { name: 'Sugar', quantity: 40, unit: 'gm' },
      { name: 'Ghee', quantity: 20, unit: 'gm' },
    ],
  },
];

export function suggestRecipeFromDishName(dishName: string): SuggestedIngredient[] {
  const normalized = dishName.trim();
  if (!normalized) return [];

  for (const matcher of TEMPLATE_MATCHERS) {
    if (matcher.pattern.test(normalized)) {
      return matcher.ingredients.map((row) => ({ ...row }));
    }
  }

  return [
    { name: 'Oil', quantity: 15, unit: 'ml' },
    { name: 'Salt', quantity: 5, unit: 'gm' },
    { name: 'Masala', quantity: 10, unit: 'gm' },
  ];
}

export function suggestCostOptimizations(
  ingredients: Array<{ name: string; quantity: number; unit: string; lineCost: number }>,
): string[] {
  const tips: string[] = [];
  const sorted = [...ingredients].sort((a, b) => b.lineCost - a.lineCost);
  if (sorted[0]?.lineCost > 0) {
    tips.push(`${sorted[0].name} drives most of the cost — consider bulk purchase or alternate supplier.`);
  }
  const oilRow = ingredients.find((row) => /oil|ghee|butter/i.test(row.name));
  if (oilRow && oilRow.quantity > 40) {
    tips.push('Oil usage looks high — review portion size to reduce waste.');
  }
  return tips;
}
