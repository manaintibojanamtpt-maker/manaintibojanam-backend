import type {
  StorefrontAddonGroupSnapshot,
  StorefrontAddonOptionSnapshot,
  StorefrontVariantSnapshot,
} from '../domain/storefront/menu-item-projection';

export const VARIANT_KIND_OPTIONS = [
  { value: 'half', label: 'Half' },
  { value: 'full', label: 'Full' },
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'regular', label: 'Regular' },
  { value: 'family', label: 'Family' },
  { value: 'custom', label: 'Custom' },
] as const;

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createVariantDraft(basePrice = 0): StorefrontVariantSnapshot {
  return {
    variantId: newId('var'),
    kind: 'full',
    displayName: 'Full',
    price: basePrice,
    sortOrder: 0,
  };
}

export function createAddonOptionDraft(): StorefrontAddonOptionSnapshot {
  return {
    optionId: newId('addon'),
    kind: 'custom',
    displayName: '',
    price: 0,
    sortOrder: 0,
  };
}

export function createAddonGroupDraft(): StorefrontAddonGroupSnapshot {
  return {
    groupId: newId('group'),
    displayName: 'Extras',
    required: false,
    options: [createAddonOptionDraft()],
  };
}

export function normalizeVariantsForSave(
  variants: readonly StorefrontVariantSnapshot[],
  basePrice: number,
): StorefrontVariantSnapshot[] {
  return variants
    .map((variant, index) => ({
      ...variant,
      variantId: variant.variantId || newId('var'),
      kind: variant.kind || 'custom',
      displayName: variant.displayName.trim(),
      price: Number.isFinite(variant.price) ? variant.price : basePrice,
      sortOrder: index,
      ...(variant.offerPrice != null && Number.isFinite(variant.offerPrice)
        ? { offerPrice: variant.offerPrice }
        : {}),
    }))
    .filter((variant) => variant.displayName.length > 0);
}

export function normalizeAddonGroupsForSave(
  groups: readonly StorefrontAddonGroupSnapshot[],
): StorefrontAddonGroupSnapshot[] {
  return groups
    .map((group) => ({
      ...group,
      groupId: group.groupId || newId('group'),
      displayName: group.displayName.trim(),
      options: group.options
        .map((option, index) => ({
          ...option,
          optionId: option.optionId || newId('addon'),
          displayName: option.displayName.trim(),
          price: Number.isFinite(option.price) ? option.price : 0,
          sortOrder: index,
        }))
        .filter((option) => option.displayName.length > 0),
    }))
    .filter((group) => group.displayName.length > 0 && group.options.length > 0);
}

export function countMenuOptions(
  variants: readonly StorefrontVariantSnapshot[],
  groups: readonly StorefrontAddonGroupSnapshot[],
): { variantCount: number; addonCount: number } {
  const variantCount = variants.filter((v) => v.displayName.trim()).length;
  const addonCount = groups.reduce(
    (sum, group) => sum + group.options.filter((o) => o.displayName.trim()).length,
    0,
  );
  return { variantCount, addonCount };
}
