export type IngredientMasterRow = {
  id: string;
  name: string;
  unit: string;
  costPerUnit?: number;
  gstPercent?: number;
};

export type RecipeIngredientRow = {
  ingredientId?: string;
  ingredient?: string;
  quantity: number;
  unit: string;
};

export type RecipeCostBreakdownLine = {
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  lineCost: number;
};

export type RecipeCostResult = {
  ingredientCost: number;
  labourCost: number;
  packagingCost: number;
  totalCost: number;
  sellingPrice: number;
  profit: number;
  marginPercent: number;
  lines: RecipeCostBreakdownLine[];
};

const UNIT_TO_BASE: Record<string, { family: 'mass' | 'volume' | 'count'; factor: number }> = {
  kg: { family: 'mass', factor: 1000 },
  gm: { family: 'mass', factor: 1 },
  grams: { family: 'mass', factor: 1 },
  g: { family: 'mass', factor: 1 },
  litre: { family: 'volume', factor: 1000 },
  l: { family: 'volume', factor: 1000 },
  ml: { family: 'volume', factor: 1 },
  pcs: { family: 'count', factor: 1 },
  pieces: { family: 'count', factor: 1 },
  packet: { family: 'count', factor: 1 },
  bottle: { family: 'count', factor: 1 },
  dozen: { family: 'count', factor: 12 },
};

function normalizeUnit(unit: string): string {
  return unit.trim().toLowerCase();
}

function convertQuantity(quantity: number, fromUnit: string, toUnit: string): number {
  const from = UNIT_TO_BASE[normalizeUnit(fromUnit)];
  const to = UNIT_TO_BASE[normalizeUnit(toUnit)];
  if (!from || !to || from.family !== to.family) return quantity;
  return (quantity * from.factor) / to.factor;
}

function resolveIngredientName(
  row: RecipeIngredientRow,
  masterById: Map<string, IngredientMasterRow>,
): string {
  if (row.ingredientId && masterById.has(row.ingredientId)) {
    return masterById.get(row.ingredientId)!.name;
  }
  return row.ingredient?.trim() || 'Unknown';
}

export function computeRecipeCost(
  ingredients: RecipeIngredientRow[],
  masterById: Map<string, IngredientMasterRow>,
  options?: {
    sellingPrice?: number;
    labourPercent?: number;
    packagingFlat?: number;
  },
): RecipeCostResult {
  const labourPercent = options?.labourPercent ?? 8;
  const packagingFlat = options?.packagingFlat ?? 5;
  const sellingPrice = options?.sellingPrice ?? 0;

  const lines: RecipeCostBreakdownLine[] = [];
  let ingredientCost = 0;

  for (const row of ingredients) {
    if (!row.quantity || row.quantity <= 0) continue;

    const master = row.ingredientId ? masterById.get(row.ingredientId) : undefined;
    const name = resolveIngredientName(row, masterById);
    const stockUnit = master?.unit || row.unit;
    const convertedQty = convertQuantity(row.quantity, row.unit, stockUnit);
    const unitCost = master?.costPerUnit ?? 0;
    const gstMultiplier = 1 + (master?.gstPercent ?? 0) / 100;
    const lineCost = convertedQty * unitCost * gstMultiplier;

    lines.push({
      name,
      quantity: row.quantity,
      unit: row.unit,
      unitCost,
      lineCost: Math.round(lineCost * 100) / 100,
    });
    ingredientCost += lineCost;
  }

  ingredientCost = Math.round(ingredientCost * 100) / 100;
  const labourCost = Math.round(((ingredientCost * labourPercent) / 100) * 100) / 100;
  const packagingCost = packagingFlat;
  const totalCost = Math.round((ingredientCost + labourCost + packagingCost) * 100) / 100;
  const profit = Math.round((sellingPrice - totalCost) * 100) / 100;
  const marginPercent =
    sellingPrice > 0 ? Math.round((profit / sellingPrice) * 1000) / 10 : 0;

  return {
    ingredientCost,
    labourCost,
    packagingCost,
    totalCost,
    sellingPrice,
    profit,
    marginPercent,
    lines,
  };
}
