import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeRecipeCost } from '../recipeCostEngine.js';
import { suggestRecipeFromDishName, suggestCostOptimizations } from '../recipeSuggestService.js';

describe('recipeCostEngine', () => {
  const masterById = new Map([
    [
      'rice',
      { id: 'rice', name: 'Rice', unit: 'kg', costPerUnit: 60, gstPercent: 0 },
    ],
    [
      'chicken',
      { id: 'chicken', name: 'Chicken', unit: 'kg', costPerUnit: 220, gstPercent: 0 },
    ],
    [
      'oil',
      { id: 'oil', name: 'Oil', unit: 'litre', costPerUnit: 180, gstPercent: 0 },
    ],
  ]);

  it('converts units and computes line costs', () => {
    const result = computeRecipeCost(
      [
        { ingredientId: 'rice', quantity: 250, unit: 'gm' },
        { ingredientId: 'chicken', quantity: 200, unit: 'gm' },
        { ingredientId: 'oil', quantity: 30, unit: 'ml' },
      ],
      masterById,
      { sellingPrice: 249, labourPercent: 8, packagingFlat: 5 },
    );

    assert.equal(result.lines.length, 3);
    assert.equal(result.lines[0].lineCost, 15);
    assert.equal(result.lines[1].lineCost, 44);
    assert.ok(result.totalCost > 0);
    assert.ok(typeof result.marginPercent === 'number');
  });
});

describe('recipeSuggestService', () => {
  it('suggests biryani template ingredients', () => {
    const rows = suggestRecipeFromDishName('Chicken Biryani');
    assert.ok(rows.length >= 5);
    assert.ok(rows.some((row) => /rice/i.test(row.name)));
    assert.ok(rows.some((row) => /chicken/i.test(row.name)));
  });

  it('returns cost optimization tips for expensive lines', () => {
    const tips = suggestCostOptimizations([
      { name: 'Chicken', quantity: 200, unit: 'gm', lineCost: 44 },
      { name: 'Rice', quantity: 250, unit: 'gm', lineCost: 15 },
    ]);
    assert.ok(tips.length >= 1);
    assert.match(tips[0], /Chicken/i);
  });
});
