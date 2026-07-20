import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCustomerOrderTrackingUrl,
  getOrderBhojanBaseUrl,
  getStorefrontBaseUrl,
} from '../customerOrderLinks.js';

describe('customerOrderLinks', () => {
  it('uses OrderBhojan URL for marketplace orders', () => {
    const url = buildCustomerOrderTrackingUrl({
      id: 'ord-abc',
      source: 'marketplace_checkout_v1',
    });
    assert.equal(url, `${getOrderBhojanBaseUrl()}/orders/ord-abc/track`);
  });

  it('uses OrderBhojan restaurant URL for legacy tenant orders', () => {
    const url = buildCustomerOrderTrackingUrl({
      id: 'ord-legacy',
      tenantId: 'mana-inti',
    });
    assert.equal(url, `${getStorefrontBaseUrl('mana-inti')}/order/ord-legacy`);
  });

  it('never returns localhost when env is unset', () => {
    const url = buildCustomerOrderTrackingUrl({ id: 'x', source: 'marketplace' });
    assert.doesNotMatch(url, /localhost/i);
  });
});
