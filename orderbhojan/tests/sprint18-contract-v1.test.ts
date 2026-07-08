import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CONTRACT_SCHEMA_VERSION } from '@bhojan/marketplace-contracts';
import { buildFoodMenuContractPayload } from '../src/marketplace-api/mocks/foodExperienceMockLogic';
import { mapFoodMenuDTOToFoodMenuResponse } from '../src/marketplace-api/mappers/v1/foodMenuV1ToLegacy';
import { resolveOfferDisplayText } from '../src/features/food/domain/contractPresentation';

describe('Sprint 18 — Marketplace contract v1', () => {
  it('MSW contract menu emits schemaVersion 1.0 envelope', () => {
    const envelope = buildFoodMenuContractPayload('demo-biryani-house');
    assert.equal(envelope.schemaVersion, CONTRACT_SCHEMA_VERSION);
    assert.ok(envelope.items.length > 0);
    assert.equal(envelope.items[0]?.schemaVersion, CONTRACT_SCHEMA_VERSION);
    assert.ok(envelope.contextToken.length > 0);
  });

  it('FoodDTO → legacy adapter preserves owner offer displayText', () => {
    const envelope = buildFoodMenuContractPayload('demo-biryani-house');
    const menu = mapFoodMenuDTOToFoodMenuResponse(envelope);
    const biryani = menu.items.find((i) => i.foodId === 'food_biryani_chicken');
    assert.ok(biryani);
    assert.equal(biryani?.ownerOfferDisplayText, '₹50 off this weekend');
    assert.equal(biryani?.contractSource, true);
    assert.equal(resolveOfferDisplayText(biryani!), '₹50 off this weekend');
  });

  it('contract adapter maps labels without renderer math', () => {
    const envelope = buildFoodMenuContractPayload('demo-biryani-house');
    const menu = mapFoodMenuDTOToFoodMenuResponse(envelope);
    const biryani = menu.items.find((i) => i.foodId === 'food_biryani_chicken');
    assert.ok(biryani?.ownerLabels?.some((l) => l.kind === 'BESTSELLER'));
    assert.ok(biryani?.ownerLabels?.some((l) => l.kind === 'CHEF_PICK'));
  });

  it('round-trip legacy → v1 → legacy keeps menu item count', () => {
    const envelope = buildFoodMenuContractPayload('demo-biryani-house');
    const menu = mapFoodMenuDTOToFoodMenuResponse(envelope);
    assert.equal(menu.items.length, envelope.items.length);
    assert.deepEqual(menu.featuredIds, envelope.featuredFoodIds);
  });
});
