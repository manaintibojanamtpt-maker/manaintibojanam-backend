import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { encryptDeliveryCredentials, decryptDeliveryCredentials } from '../deliverySecretCrypto.js';
import {
  DELIVERY_PROVIDER_CAPABILITY_MATRIX,
  getProviderCapabilityRow,
} from '../providerCapabilityMatrix.js';
import { toPublicConnection } from '../deliveryProviderConnectionModel.js';
import { mapUiPartnerToProviderId, orchestrateTenantDispatch } from '../dispatchOrchestration.js';
import type { DeliveryConnectionServiceDeps } from '../deliveryConnectionService.js';

describe('delivery provider capability matrix', () => {
  it('lists Uber Direct, Porter, Rapido, self_pickup with expected maturity', () => {
    const ids = DELIVERY_PROVIDER_CAPABILITY_MATRIX.map((p) => p.id);
    assert.deepEqual(ids.sort(), ['porter', 'rapido', 'self_pickup', 'uber_direct'].sort());
    assert.equal(getProviderCapabilityRow('uber_direct')?.maturity, 'production_ready_scaffold');
    assert.equal(getProviderCapabilityRow('porter')?.maturity, 'partner_access_required');
    assert.equal(getProviderCapabilityRow('rapido')?.maturity, 'manual_fallback_only');
  });

  it('exposes merchant onboarding steps and field help (not raw-dev only)', () => {
    const uber = getProviderCapabilityRow('uber_direct');
    assert.ok(uber?.onboardingSteps?.length);
    assert.ok(uber?.credentialFieldHelp?.some((f) => f.key === 'clientSecret' && f.findItUrl));
    assert.match(uber?.merchantSummary ?? '', /Uber Direct/i);
    const porter = getProviderCapabilityRow('porter');
    assert.match(porter?.statusBadgeHint ?? '', /Partner approval/i);
  });
});

describe('delivery secret crypto', () => {
  it('round-trips credentials without leaking plaintext shape errors', () => {
    const enc = encryptDeliveryCredentials({
      clientId: 'cid',
      clientSecret: 'csec',
      customerId: 'cust_1',
    });
    assert.ok(enc.ciphertext);
    assert.ok(enc.iv);
    const dec = decryptDeliveryCredentials(enc);
    assert.equal(dec.clientId, 'cid');
    assert.equal(dec.customerId, 'cust_1');
  });
});

describe('public connection projection', () => {
  it('never exposes ciphertext fields', () => {
    const pub = toPublicConnection({
      tenantId: 't1',
      provider: 'uber_direct',
      connectionType: 'api_credentials',
      status: 'connected',
      secretRef: 'tenants/t1/deliveryProviderSecrets/uber_direct',
      scopes: ['eats.deliveries'],
      capabilities: ['quote', 'create_dispatch'],
      metadata: {},
    });
    assert.equal(pub.hasSecretRef, true);
    assert.equal('secretRef' in pub, false);
    assert.equal('ciphertext' in pub, false);
  });
});

describe('dispatch orchestration tenant isolation + fallback', () => {
  it('maps UI partner labels to provider ids', () => {
    assert.equal(mapUiPartnerToProviderId('Porter'), 'porter');
    assert.equal(mapUiPartnerToProviderId('Uber'), 'uber_direct');
    assert.equal(mapUiPartnerToProviderId('Self Pickup'), 'self_pickup');
  });

  it('falls back to manual tracking when tenant has no connection', async () => {
    const store = new Map<string, Record<string, unknown>>();
    const deps: DeliveryConnectionServiceDeps = {
      fieldValue: { serverTimestamp: () => new Date() },
      db: {
        collection(name: string) {
          if (name === 'tenants') {
            return {
              doc(tenantId: string) {
                return {
                  collection(sub: string) {
                    return {
                      doc(provider: string) {
                        const key = `${tenantId}/${sub}/${provider}`;
                        return {
                          async get() {
                            const data = store.get(key);
                            return { exists: Boolean(data), data: () => data };
                          },
                        };
                      },
                    };
                  },
                };
              },
            };
          }
          return {
            async add() {
              return { id: 'audit_1' };
            },
          };
        },
      } as unknown as DeliveryConnectionServiceDeps['db'],
    };

    const result = await orchestrateTenantDispatch(deps, {
      tenantId: 'tenant_a',
      provider: 'porter',
      orderId: 'ord_1',
      customerName: 'Pat',
      customerPhone: '9999999999',
      pickupAddress: 'Kitchen',
      dropoffAddress: 'Home',
      manualTrackingUrl: 'https://porter.in/track?id=1',
      allowManualFallback: true,
    });

    assert.equal(result.mode, 'manual_fallback');
    assert.equal(result.deliveryData.trackingUrl, 'https://porter.in/track?id=1');
    assert.match(result.message, /No linked Porter connection/i);
  });

  it('blocks when no connection and manual fallback disabled', async () => {
    const deps: DeliveryConnectionServiceDeps = {
      fieldValue: { serverTimestamp: () => new Date() },
      db: {
        collection() {
          return {
            doc() {
              return {
                collection() {
                  return {
                    doc() {
                      return {
                        async get() {
                          return { exists: false, data: () => undefined };
                        },
                      };
                    },
                  };
                },
              };
            },
            async add() {
              return { id: 'a' };
            },
          };
        },
      } as unknown as DeliveryConnectionServiceDeps['db'],
    };

    const result = await orchestrateTenantDispatch(deps, {
      tenantId: 'tenant_b',
      provider: 'uber_direct',
      orderId: 'ord_2',
      customerName: 'Pat',
      customerPhone: '9999999999',
      pickupAddress: 'Kitchen',
      dropoffAddress: 'Home',
      allowManualFallback: false,
    });

    assert.equal(result.mode, 'blocked');
  });

  it('keeps tenant A connection lookup separate from tenant B key space', async () => {
    const store = new Map<string, Record<string, unknown>>();
    store.set('tenant_a/deliveryProviderConnections/porter', {
      status: 'connected',
      connectionType: 'api_credentials',
      scopes: [],
      capabilities: ['create_dispatch'],
      metadata: {},
      secretRef: 'x',
    });
    // No secret for tenant_a → load returns null → manual fallback
    // tenant_b has nothing

    const deps: DeliveryConnectionServiceDeps = {
      fieldValue: { serverTimestamp: () => new Date() },
      db: {
        collection(name: string) {
          if (name === 'tenants') {
            return {
              doc(tenantId: string) {
                return {
                  collection(sub: string) {
                    return {
                      doc(provider: string) {
                        const key = `${tenantId}/${sub}/${provider}`;
                        return {
                          async get() {
                            const data = store.get(key);
                            return { exists: Boolean(data), data: () => data };
                          },
                        };
                      },
                    };
                  },
                };
              },
            };
          }
          return { async add() { return { id: 'a' }; } };
        },
      } as unknown as DeliveryConnectionServiceDeps['db'],
    };

    const a = await orchestrateTenantDispatch(deps, {
      tenantId: 'tenant_a',
      provider: 'porter',
      orderId: '1',
      customerName: 'A',
      customerPhone: '1',
      pickupAddress: 'p',
      dropoffAddress: 'd',
      manualTrackingUrl: 'https://example.com/a',
    });
    const b = await orchestrateTenantDispatch(deps, {
      tenantId: 'tenant_b',
      provider: 'porter',
      orderId: '2',
      customerName: 'B',
      customerPhone: '2',
      pickupAddress: 'p',
      dropoffAddress: 'd',
      manualTrackingUrl: 'https://example.com/b',
    });

    assert.equal(a.deliveryData.trackingUrl, 'https://example.com/a');
    assert.equal(b.deliveryData.trackingUrl, 'https://example.com/b');
    assert.equal(a.provider, 'porter');
    assert.equal(b.provider, 'porter');
  });
});
