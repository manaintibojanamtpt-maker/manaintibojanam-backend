import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateUberDirectReadiness,
  isUberDirectLiveEnabled,
  mapUberDirectErrorMessage,
} from '../uberDirectReadiness.js';
import {
  evaluatePorterApprovalReadiness,
  isPorterLiveEnabled,
} from '../porterApprovalReadiness.js';
import { uberDirectAdapter } from '../adapters/uberDirectAdapter.js';
import { porterAdapter } from '../adapters/porterAdapter.js';
import { getProviderCapabilityRow } from '../providerCapabilityMatrix.js';

describe('Uber Direct live readiness', () => {
  it('keeps live flag off by default', () => {
    assert.equal(isUberDirectLiveEnabled({}), false);
    assert.equal(isUberDirectLiveEnabled({ UBER_DIRECT_LIVE: '1' }), true);
  });

  it('reports scaffold_ready when connected but live flag off', () => {
    const report = evaluateUberDirectReadiness({
      env: { DELIVERY_INTEGRATION_SECRET_KEY: 'a'.repeat(32) },
      connectionStatus: 'connected',
      hasSecretRef: true,
      merchantAccountId: 'cust_1',
    });
    assert.equal(report.level, 'scaffold_ready');
    assert.equal(report.canLiveDispatch, false);
    assert.match(report.merchantMessage, /UBER_DIRECT_LIVE|Live auto-booking/i);
  });

  it('reports live_ready only with secret key + connection + live flag', () => {
    const report = evaluateUberDirectReadiness({
      env: {
        DELIVERY_INTEGRATION_SECRET_KEY: 'a'.repeat(32),
        UBER_DIRECT_LIVE: '1',
      },
      connectionStatus: 'connected',
      hasSecretRef: true,
      merchantAccountId: 'cust_1',
    });
    assert.equal(report.level, 'live_ready');
    assert.equal(report.canLiveDispatch, true);
  });

  it('maps OAuth errors to merchant-safe copy without leaking secrets', () => {
    const msg = mapUberDirectErrorMessage(new Error('Uber OAuth failed (401)'));
    assert.match(msg, /Client ID|Client Secret/i);
    assert.doesNotMatch(msg, /sk_live|password|ciphertext/i);
  });

  it('blocks createDispatch when UBER_DIRECT_LIVE is off (no fake booked trip)', async () => {
    const prev = process.env.UBER_DIRECT_LIVE;
    delete process.env.UBER_DIRECT_LIVE;
    try {
      const result = await uberDirectAdapter.createDispatch(
        { customerId: 'c', clientId: 'id', clientSecret: 'sec' },
        {
          tenantId: 't1',
          orderId: 'o1',
          pickupAddress: 'A',
          dropoffAddress: 'B',
          customerName: 'N',
          customerPhone: '9',
        },
      );
      assert.equal(result.status, 'blocked');
      assert.match(result.message ?? '', /UBER_DIRECT_LIVE|manual tracking/i);
    } finally {
      if (prev === undefined) delete process.env.UBER_DIRECT_LIVE;
      else process.env.UBER_DIRECT_LIVE = prev;
    }
  });
});

describe('Porter partner approval readiness', () => {
  it('keeps PORTER_LIVE off by default and marks partner gate', () => {
    assert.equal(isPorterLiveEnabled({}), false);
    const row = getProviderCapabilityRow('porter');
    assert.equal(row?.partnerApprovalRequired, true);
    assert.match(row?.liveReadinessNote ?? '', /cannot proceed|approval/i);
  });

  it('credentials_stored_pending_live when secrets saved but approval incomplete', () => {
    const report = evaluatePorterApprovalReadiness({
      env: {},
      connectionStatus: 'pending',
      hasSecretRef: true,
      metadata: {},
    });
    assert.equal(report.approvalState, 'credentials_stored_pending_live');
    assert.equal(report.canLiveDispatch, false);
    assert.equal(report.manualFallbackAvailable, true);
    assert.match(report.merchantMessage, /manual|tracking/i);
  });

  it('blocks createDispatch without PORTER_LIVE', async () => {
    const prev = process.env.PORTER_LIVE;
    delete process.env.PORTER_LIVE;
    try {
      const result = await porterAdapter.createDispatch(
        { apiKey: 'k', merchantAccountId: 'm' },
        {
          tenantId: 't1',
          orderId: 'o1',
          pickupAddress: 'A',
          dropoffAddress: 'B',
          customerName: 'N',
          customerPhone: '9',
        },
      );
      assert.equal(result.status, 'blocked');
      assert.match(result.message ?? '', /partner|manual/i);
    } finally {
      if (prev === undefined) delete process.env.PORTER_LIVE;
      else process.env.PORTER_LIVE = prev;
    }
  });
});
