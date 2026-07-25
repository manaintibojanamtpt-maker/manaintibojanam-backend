import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildOrderingSystemAddon,
  parseOrderingAssistContext,
} from '../orderingAssistContracts.js';

describe('ordering assist context grounding', () => {
  it('parses nested orderingContext with kitchens and menu items', () => {
    const parsed = parseOrderingAssistContext({
      orderingContext: {
        areaLabel: 'Manjari BK',
        nearbyKitchens: [{ id: 'k1', name: 'Inti Bojanam', cuisine: 'Home style' }],
        menuItems: [{ id: 'm1', name: 'Masala Dosa', price: 80, isVeg: true }],
      },
    });
    assert.equal(parsed.used, true);
    assert.equal(parsed.context?.nearbyKitchens?.[0]?.name, 'Inti Bojanam');
    assert.equal(parsed.context?.menuItems?.[0]?.name, 'Masala Dosa');
  });

  it('builds addon that forbids inventing dishes outside facts', () => {
    const addon = buildOrderingSystemAddon({
      nearbyKitchens: [{ name: 'Inti Bojanam' }],
      menuItems: [{ name: 'Masala Dosa', isVeg: true }],
    });
    assert.match(addon, /Do not invent/);
    assert.match(addon, /Inti Bojanam/);
    assert.match(addon, /Masala Dosa/);
    assert.match(addon, /cart_add_plan/);
  });
});
