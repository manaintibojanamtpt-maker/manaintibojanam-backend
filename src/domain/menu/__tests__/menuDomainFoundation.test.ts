import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MENU_DOMAIN_SCHEMA_VERSION,
  MENU_DOMAIN_VERSION,
} from '../shared/MenuDomainConstants';
import { MENU_REASON_CODES } from '../shared/MenuReasonCodes';
import type { MenuCatalog } from '../catalog/MenuCatalog';
import type { MenuCategory } from '../catalog/MenuCategory';
import type { MenuItem } from '../catalog/MenuItem';
import { validateCatalog, validateCategory, validateMenuItem } from '../catalog/catalogRules';
import type { Combo } from '../combos/Combo';
import { validateCombo, resolveComboAvailabilityFromComponents } from '../combos/comboRules';
import type { ModifierGroup } from '../modifiers/ModifierGroup';
import {
  validateModifier,
  validateModifierGroup,
  validateModifierSelection,
} from '../modifiers/modifierRules';
import { validatePriceSnapshot, createEffectivePrice } from '../pricing/pricingRules';
import type { PriceSnapshot } from '../pricing/PriceSnapshot';
import {
  validateAvailability,
  aggregateComboAvailability,
} from '../availability/availabilityRules';
import { MenuDomainValidator } from '../validation/MenuDomainValidator';
import { CategoryValidator } from '../validation/CategoryValidator';
import { ItemValidator } from '../validation/ItemValidator';
import { ModifierValidator } from '../validation/ModifierValidator';
import { ComboValidator } from '../validation/ComboValidator';
import { AvailabilityValidator } from '../validation/AvailabilityValidator';

const price = (amount = 100): PriceSnapshot => ({ amount, currency: 'INR' });

const category = (overrides: Partial<MenuCategory> = {}): MenuCategory => ({
  categoryId: 'cat-1',
  name: 'Mains',
  sortOrder: 0,
  itemIds: ['item-1'],
  active: true,
  ...overrides,
});

const item = (overrides: Partial<MenuItem> = {}): MenuItem => ({
  itemId: 'item-1',
  name: 'Thali',
  categoryId: 'cat-1',
  price: price(),
  availability: { state: 'available' },
  active: true,
  ...overrides,
});

const catalog = (overrides: Partial<MenuCatalog> = {}): MenuCatalog => ({
  catalogId: 'catalog-1',
  tenantId: 'tenant-1',
  name: 'Main Menu',
  categories: [category()],
  items: [item()],
  version: '1.0.0',
  ...overrides,
});

const combo = (overrides: Partial<Combo> = {}): Combo => ({
  comboId: 'combo-1',
  name: 'Family Combo',
  components: [{ itemId: 'item-1', quantity: 1, required: true }],
  price: price(250),
  availability: { state: 'available' },
  active: true,
  ...overrides,
});

const modifierGroup = (overrides: Partial<ModifierGroup> = {}): ModifierGroup => ({
  groupId: 'group-1',
  name: 'Extras',
  required: false,
  minSelections: 0,
  maxSelections: 2,
  modifiers: [
    { modifierId: 'mod-1', name: 'Raita', price: price(20), active: true },
    { modifierId: 'mod-2', name: 'Papad', price: price(10), active: true },
  ],
  ...overrides,
});

describe('Menu domain foundation (M7 PR-2)', () => {
  it('exports MENU_DOMAIN_VERSION 0.2.0-foundation', () => {
    assert.equal(MENU_DOMAIN_VERSION, '0.2.0-foundation');
    assert.equal(MENU_DOMAIN_SCHEMA_VERSION, '0.2.0');
  });

  it('validateCategory rejects empty name', () => {
    const result = CategoryValidator.validate(category({ name: '  ' }));
    assert.equal(result.valid, false);
    assert.equal(result.errors[0]?.code, MENU_REASON_CODES.EMPTY_NAME);
  });

  it('validateMenuItem rejects invalid price', () => {
    const result = ItemValidator.validate(item({ price: { amount: -1, currency: 'INR' } }));
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.code === MENU_REASON_CODES.INVALID_PRICE));
  });

  it('validateCatalog rejects duplicate item IDs', () => {
    const result = MenuDomainValidator.validate(
      catalog({
        items: [item(), item({ itemId: 'item-1', name: 'Duplicate' })],
      })
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.code === MENU_REASON_CODES.DUPLICATE_ITEM_ID));
  });

  it('validateCatalog rejects orphan category item reference', () => {
    const result = validateCatalog(
      catalog({
        categories: [category({ itemIds: ['missing-item'] })],
        items: [item()],
      })
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.code === MENU_REASON_CODES.ORPHAN_ITEM_REFERENCE));
  });

  it('validateModifierGroup enforces selection range', () => {
    const result = ModifierValidator.validateGroup(
      modifierGroup({ minSelections: 3, maxSelections: 1 })
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.code === MENU_REASON_CODES.INVALID_SELECTION_RANGE));
  });

  it('validateModifierSelection prevents duplicate selections', () => {
    const group = modifierGroup({ minSelections: 0, maxSelections: 2 });
    const result = validateModifierSelection(group, {
      groupId: 'group-1',
      selectedModifierIds: ['mod-1', 'mod-1'],
    });
    assert.equal(result.valid, false);
    assert.ok(
      result.errors.some((error) => error.code === MENU_REASON_CODES.DUPLICATE_MODIFIER_SELECTION)
    );
  });

  it('validateModifierSelection enforces minimum selections', () => {
    const group = modifierGroup({ required: true, minSelections: 1, maxSelections: 2 });
    const result = ModifierValidator.validateSelection(group, {
      groupId: 'group-1',
      selectedModifierIds: [],
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.code === MENU_REASON_CODES.SELECTION_BELOW_MINIMUM));
  });

  it('validateCombo rejects empty components', () => {
    const result = ComboValidator.validate(combo({ components: [] }));
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.code === MENU_REASON_CODES.COMBO_EMPTY_COMPONENTS));
  });

  it('validateCombo requires at least one required component', () => {
    const result = validateCombo(
      combo({ components: [{ itemId: 'item-1', quantity: 1, required: false }] })
    );
    assert.equal(result.valid, false);
    assert.ok(
      result.errors.some((error) => error.code === MENU_REASON_CODES.COMBO_MISSING_REQUIRED_COMPONENT)
    );
  });

  it('aggregateComboAvailability returns out_of_stock when any component is out of stock', () => {
    const aggregated = AvailabilityValidator.aggregateComponentAvailability([
      { state: 'available' },
      { state: 'out_of_stock' },
    ]);
    assert.equal(aggregated.state, 'out_of_stock');
  });

  it('resolveComboAvailabilityFromComponents matches aggregate rules', () => {
    const aggregated = resolveComboAvailabilityFromComponents([
      { state: 'temporarily_unavailable' },
      { state: 'available' },
    ]);
    assert.equal(aggregated.state, 'temporarily_unavailable');
  });

  it('validatePriceSnapshot accepts valid price', () => {
    const result = validatePriceSnapshot(price());
    assert.equal(result.valid, true);
  });

  it('createEffectivePrice returns base as final when no discount', () => {
    const result = createEffectivePrice(price(150));
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.discountApplied, false);
      assert.equal(result.value.final.amount, 150);
    }
  });

  it('validateAvailability rejects invalid state', () => {
    const result = validateAvailability({ state: 'invalid' as 'available' });
    assert.equal(result.valid, false);
  });

  it('validateModifier rejects empty modifier id', () => {
    const result = validateModifier({
      modifierId: '',
      name: 'Extra',
      price: price(),
      active: true,
    });
    assert.equal(result.valid, false);
  });

  it('aggregateComboAvailability returns available when all components available', () => {
    const result = aggregateComboAvailability([{ state: 'available' }, { state: 'available' }]);
    assert.equal(result.state, 'available');
  });
});
