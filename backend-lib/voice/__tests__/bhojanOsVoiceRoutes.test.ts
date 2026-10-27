import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {
  sanitizeKeyterms,
  BHOJANOS_OPERATIONAL_KEYWORDS,
} from '../voiceKeyterms.js';
import {
  matchVoiceItemsToMenu,
  parseKitchenCommand,
  registerBhojanOsVoiceRoutes,
} from '../bhojanOsVoiceRoutes.js';
import { resetSttProviderForTests } from '../voiceSttRoute.js';

describe('BhojanOS Saaras v4 Multilingual Voice Routes', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = { ...originalEnv };
    resetSttProviderForTests();
  });

  describe('Keyterms & Domain Biasing (Saaras v4 constraints)', () => {
    it('caps keyterms at 50 items and enforces 64 char max length', () => {
      const longTerm = 'A'.repeat(80);
      const manyTerms = Array.from({ length: 70 }, (_, i) => `Dish ${i}`);
      manyTerms.push(longTerm);

      const sanitized = sanitizeKeyterms(manyTerms, 50, 64);

      assert.equal(sanitized.length, 50);
      assert.ok(sanitized.every(t => t.length <= 64));
    });

    it('deduplicates case-insensitively and parses JSON string format', () => {
      const jsonInput = JSON.stringify(['Chicken Biryani', 'chicken biryani', 'CHICKEN BIRYANI', 'Mutton Sukka']);
      const sanitized = sanitizeKeyterms(jsonInput);

      assert.deepEqual(sanitized, ['Chicken Biryani', 'Mutton Sukka']);
    });
  });

  describe('matchVoiceItemsToMenu (POS Voice Dictation)', () => {
    const mockMenu = [
      { id: 'item_1', name: 'Chicken Biryani', price: 250, isAvailable: true },
      { id: 'item_2', name: 'Masala Dosa', price: 80, isAvailable: true },
      { id: 'item_3', name: 'Filter Coffee', price: 30, isAvailable: true },
      { id: 'item_4', name: 'Unavailable Dish', price: 100, isAvailable: false },
    ];

    it('matches English and multilingual quantities and calculates totals', () => {
      const transcript = 'two chicken biryani and one filter coffee parcel';
      const result = matchVoiceItemsToMenu(transcript, mockMenu);

      assert.equal(result.matched.length, 2);
      const biryani = result.matched.find(m => m.name === 'Chicken Biryani');
      assert.ok(biryani);
      assert.equal(biryani.quantity, 2);
      assert.equal(biryani.unitPrice, 250);
      assert.equal(biryani.totalPrice, 500);

      const coffee = result.matched.find(m => m.name === 'Filter Coffee');
      assert.ok(coffee);
      assert.equal(coffee.quantity, 1);
      assert.equal(coffee.totalPrice, 30);
    });

    it('matches Indic numbers (rendu, ek) and ignores unavailable items', () => {
      const transcript = 'rendu masala dosa ek unavailable dish';
      const result = matchVoiceItemsToMenu(transcript, mockMenu);

      assert.equal(result.matched.length, 1);
      assert.equal(result.matched[0].name, 'Masala Dosa');
      assert.equal(result.matched[0].quantity, 2);
      assert.equal(result.matched[0].totalPrice, 160);
    });
  });

  describe('parseKitchenCommand', () => {
    it('detects MarkReady action and order numbers', () => {
      const parsed = parseKitchenCommand('Order 104 is ready mark ready');
      assert.equal(parsed.action, 'MarkReady');
      assert.equal(parsed.orderReference, '104');
    });

    it('detects MarkPreparing and table number', () => {
      const parsed = parseKitchenCommand('Table 5 start cooking order #88');
      assert.equal(parsed.action, 'MarkPreparing');
      assert.equal(parsed.orderReference, '88');
      assert.equal(parsed.tableNumber, '5');
    });

    it('detects Indic words like tayyar for ready', () => {
      const parsed = parseKitchenCommand('Order #42 tayyar ho gaya');
      assert.equal(parsed.action, 'MarkReady');
      assert.equal(parsed.orderReference, '42');
    });
  });

  describe('Tenant Voice Routes HTTP Endpoints', () => {
    const mockVerifyToken = async (token: string) => {
      if (token === 'cashier-token') {
        return { uid: 'user_cashier_1', email: 'cashier@bhojanos.in' };
      }
      if (token === 'kitchen-token') {
        return { uid: 'user_chef_1', email: 'chef@bhojanos.in' };
      }
      if (token === 'other-tenant-token') {
        return { uid: 'user_other_1', email: 'other@bhojanos.in' };
      }
      throw new Error('Invalid token');
    };

    const mockGetMemberships = async (uid: string) => {
      if (uid === 'user_cashier_1') {
        return [{ tenantId: 'tenant_kalyan_kitchen', role: 'cashier' }];
      }
      if (uid === 'user_chef_1') {
        return [{ tenantId: 'tenant_kalyan_kitchen', role: 'kitchen' }];
      }
      if (uid === 'user_other_1') {
        return [{ tenantId: 'tenant_other_kitchen', role: 'cashier' }];
      }
      return [];
    };

    const setupTestApp = () => {
      const app = express();
      app.use(express.json());
      registerBhojanOsVoiceRoutes(app, {
        verifyFirebaseToken: mockVerifyToken,
        getTenantMemberships: mockGetMemberships,
        db: {
          collection: (col: string) => ({
            where: () => ({
              limit: () => ({
                get: async () => ({
                  empty: false,
                  docs: [
                    {
                      id: 'dish_101',
                      data: () => ({ name: 'Special Chicken Biryani', price: 280, isAvailable: true }),
                    },
                  ],
                }),
              }),
            }),
            doc: () => ({
              get: async () => ({
                exists: true,
                id: 'order_104',
                data: () => ({ tenantId: 'tenant_kalyan_kitchen', status: 'IN_PREPARATION', version: 1 }),
              }),
            }),
          }),
        },
        fieldValue: { serverTimestamp: () => new Date() },
      });
      return app;
    };

    it('enforces authentication header on /transcribe', async () => {
      const app = setupTestApp();
      const server = app.listen(0);
      const port = (server.address() as any).port;

      try {
        const res = await fetch(`http://localhost:${port}/api/v1/tenants/tenant_kalyan_kitchen/voice/transcribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioBase64: 'dGVzdA==' }),
        });

        assert.equal(res.status, 401);
        const json = await res.json();
        assert.equal(json.code, 'UNAUTHENTICATED');
      } finally {
        server.close();
      }
    });

    it('rejects caller with 403 when not a member of requested tenant', async () => {
      const app = setupTestApp();
      const server = app.listen(0);
      const port = (server.address() as any).port;

      try {
        const res = await fetch(`http://localhost:${port}/api/v1/tenants/tenant_kalyan_kitchen/voice/transcribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer other-tenant-token',
          },
          body: JSON.stringify({ audioBase64: 'dGVzdA==' }),
        });

        assert.equal(res.status, 403);
        const json = await res.json();
        assert.equal(json.code, 'FORBIDDEN_TENANT');
      } finally {
        server.close();
      }
    });

    it('transcribes speech with saaras:v4 and tenant biasing for authorized cashier', async () => {
      process.env.SARVAM_API_KEY = 'test-sarvam-key';

      const mockFetch = (async (url: string, init: any) => {
        if (typeof url === 'string' && url.includes('speech-to-text')) {
          return new Response(
            JSON.stringify({
              transcript: 'two special chicken biryani kavali',
              language_code: 'te-IN',
              confidence: 0.96,
              request_id: 'req_sarvam_test_123',
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        return originalFetch(url, init);
      }) as any;
      globalThis.fetch = mockFetch;

      const app = setupTestApp();
      const server = app.listen(0);
      const port = (server.address() as any).port;

      try {
        const res = await fetch(`http://localhost:${port}/api/v1/tenants/tenant_kalyan_kitchen/voice/transcribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer cashier-token',
          },
          body: JSON.stringify({
            audioBase64: Buffer.from('mock-audio-pcm').toString('base64'),
          }),
        });

        assert.equal(res.status, 200);
        const json = await res.json();
        assert.equal(json.success, true);
        assert.equal(json.transcript, 'two special chicken biryani kavali');
        assert.equal(json.language, 'te-IN');
        assert.equal(json.model, 'saaras:v4');
        assert.equal(json.tenantId, 'tenant_kalyan_kitchen');
        assert.equal(json.caller.role, 'cashier');
        assert.ok(json.keytermsUsedCount > 0);
      } finally {
        server.close();
      }
    });

    it('generates DRAFT POS bill and requires confirmation on /pos-draft', async () => {
      const app = setupTestApp();
      const server = app.listen(0);
      const port = (server.address() as any).port;

      try {
        const res = await fetch(`http://localhost:${port}/api/v1/tenants/tenant_kalyan_kitchen/voice/pos-draft`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer cashier-token',
          },
          body: JSON.stringify({
            transcript: 'two special chicken biryani parcel table 3',
          }),
        });

        assert.equal(res.status, 200);
        const json = await res.json();
        assert.equal(json.success, true);
        assert.equal(json.draft.status, 'DRAFT');
        assert.equal(json.draft.requiresCashierConfirmation, true);
        assert.equal(json.draft.orderType, 'TAKEAWAY');
        assert.equal(json.draft.tableNumber, '3');
        assert.equal(json.draft.items.length, 1);
        assert.equal(json.draft.items[0].name, 'Special Chicken Biryani');
        assert.equal(json.draft.items[0].quantity, 2);
        assert.equal(json.draft.items[0].totalPrice, 560);
      } finally {
        server.close();
      }
    });

    it('returns 403 on /pos-draft when kitchen staff attempts to create POS bills', async () => {
      const app = setupTestApp();
      const server = app.listen(0);
      const port = (server.address() as any).port;

      try {
        const res = await fetch(`http://localhost:${port}/api/v1/tenants/tenant_kalyan_kitchen/voice/pos-draft`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer kitchen-token',
          },
          body: JSON.stringify({ transcript: 'two biryani' }),
        });

        assert.equal(res.status, 403);
        const json = await res.json();
        assert.equal(json.code, 'FORBIDDEN_ROLE');
      } finally {
        server.close();
      }
    });

    it('parses proposed kitchen command and requires confirmation on /kitchen-command', async () => {
      const app = setupTestApp();
      const server = app.listen(0);
      const port = (server.address() as any).port;

      try {
        const res = await fetch(`http://localhost:${port}/api/v1/tenants/tenant_kalyan_kitchen/voice/kitchen-command`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer kitchen-token',
          },
          body: JSON.stringify({
            transcript: 'Order 104 is ready mark ready',
          }),
        });

        assert.equal(res.status, 200);
        const json = await res.json();
        assert.equal(json.success, true);
        assert.equal(json.executed, false);
        assert.equal(json.proposedCommand.commandType, 'MarkReady');
        assert.equal(json.proposedCommand.orderReference, '104');
        assert.equal(json.proposedCommand.matchedOrderId, 'order_104');
        assert.equal(json.proposedCommand.requiresConfirmation, true);
      } finally {
        server.close();
      }
    });
  });
});
