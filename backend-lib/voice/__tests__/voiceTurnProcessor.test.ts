import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  processVoiceAssistantTurn,
  detectLanguage,
  extractQuantity,
  sanitizeTechnicalIds,
} from '../voiceTurnProcessor.js';
import { signGuestOrderToken } from '../../guestOrderToken.js';
import { getIstBusinessDayRange, getAuthoritativeDailySalesSummary } from '../authoritativeReporting.js';

describe('VoiceTurnProcessor Unit & Multi-Turn Tests', () => {
  describe('detectLanguage & extractQuantity', () => {
    it('detects Telugu script and Telugu romanized words', () => {
      assert.equal(detectLanguage('రెండు మసాలా దోశలు కావాలి'), 'te-IN');
      assert.equal(detectLanguage('anna rendu plate idli kavali'), 'te-IN');
      assert.equal(detectLanguage('naa cart lo emundi'), 'te-IN');
    });

    it('detects Hindi script and Hindi romanized words', () => {
      assert.equal(detectLanguage('दो मसाला डोसा चाहिए'), 'hi-IN');
      assert.equal(detectLanguage('bhaiya do plate biryani kardo'), 'hi-IN');
      assert.equal(detectLanguage('kitna hua total'), 'hi-IN');
    });

    it('defaults to en-IN for English phrases', () => {
      assert.equal(detectLanguage('Add two masala dosas to cart'), 'en-IN');
      assert.equal(detectLanguage('Where is my order?'), 'en-IN');
    });

    it('extracts quantities accurately across languages', () => {
      assert.equal(extractQuantity('one dosa'), 1);
      assert.equal(extractQuantity('rendu plate dosa'), 2);
      assert.equal(extractQuantity('teen biryani'), 3);
      assert.equal(extractQuantity('nalugu idli'), 4);
      assert.equal(extractQuantity('paanch roti'), 5);
      assert.equal(extractQuantity('12 rotis'), 12);
    });

    it('sanitizes technical database keys', () => {
      assert.equal(sanitizeTechnicalIds('Order obr_123456 has item_dosa_999'), 'Order has');
      assert.equal(sanitizeTechnicalIds('txn_98765 completed'), 'completed');
    });
  });

  describe('Multi-Turn Conversational Flow & Conversational Quantity/Modifier Semantics', () => {
    const mockMenuItems = [
      { id: 'item_1', name: 'Masala Dosa', price: 70, isAvailable: true, isVeg: true },
      { id: 'item_2', name: 'Plain Dosa', price: 50, isAvailable: true, isVeg: true },
      { id: 'item_3', name: 'Idli Sambar', price: 40, isAvailable: true, isVeg: true },
    ];

    it('Turn 1: "Add two dosas" proposes cart plan with qty 2', async () => {
      const outcome = await processVoiceAssistantTurn({
        sessionId: 'sess_1',
        transcript: 'Add two Masala Dosa',
        context: { menuItems: mockMenuItems },
      });

      assert.equal(outcome.intent, 'cart_add_plan');
      assert.equal(outcome.proposedActions?.length, 1);
      assert.equal(outcome.proposedActions![0].type, 'cart_add_plan');
      assert.equal((outcome.proposedActions![0].payload as any).name, 'Masala Dosa');
      assert.equal((outcome.proposedActions![0].payload as any).quantity, 2);
      assert.equal((outcome.proposedActions![0].payload as any).price, 70);
      assert.ok(outcome.reply.includes('2 Masala Dosa'));
    });

    it('Turn 2: "Make that three" updates quantity of the active item to 3', async () => {
      const outcome = await processVoiceAssistantTurn({
        sessionId: 'sess_1',
        transcript: 'Make that three',
        context: {
          cart: {
            items: [{ id: 'item_1', name: 'Masala Dosa', quantity: 2, price: 70 }],
          },
          lastProposedItem: { id: 'item_1', name: 'Masala Dosa', quantity: 2, price: 70 },
        },
      });

      assert.equal(outcome.intent, 'cart_update_quantity');
      assert.equal(outcome.proposedActions?.length, 1);
      assert.equal(outcome.proposedActions![0].type, 'cart_update_quantity');
      assert.equal((outcome.proposedActions![0].payload as any).foodId, 'item_1');
      assert.equal((outcome.proposedActions![0].payload as any).quantity, 3);
      assert.ok(outcome.reply.includes('3'));
    });

    it('Turn 3: "One without onion" represents 3 units total: 2 regular and 1 without onion', async () => {
      const outcome = await processVoiceAssistantTurn({
        sessionId: 'sess_1',
        transcript: 'One without onion',
        context: {
          cart: {
            items: [{ id: 'item_1', name: 'Masala Dosa', quantity: 3, price: 70 }],
          },
          lastProposedItem: { id: 'item_1', name: 'Masala Dosa', quantity: 3, price: 70 },
        },
      });

      assert.equal(outcome.intent, 'cart_update_split_units');
      assert.equal(outcome.proposedActions?.length, 2);

      // Action 1: Remaining regular units (3 - 1 = 2)
      assert.equal(outcome.proposedActions![0].type, 'cart_update_quantity');
      assert.equal((outcome.proposedActions![0].payload as any).foodId, 'item_1');
      assert.equal((outcome.proposedActions![0].payload as any).quantity, 2);

      // Action 2: 1 unit with custom modifier
      assert.equal(outcome.proposedActions![1].type, 'cart_add_item');
      assert.equal((outcome.proposedActions![1].payload as any).quantity, 1);
      assert.equal((outcome.proposedActions![1].payload as any).notes, 'One without onion');

      // Total units strictly verified: 2 + 1 = 3
      const totalUnits =
        ((outcome.proposedActions![0].payload as any).quantity as number) +
        ((outcome.proposedActions![1].payload as any).quantity as number);
      assert.equal(totalUnits, 3);

      assert.ok(outcome.reply.includes('3'));
      assert.ok(outcome.reply.includes('2 regular and 1 with'));
    });

    it('Turn 4: "Remove the last one" clarifies ambiguity when item has quantity > 1', async () => {
      const outcome = await processVoiceAssistantTurn({
        sessionId: 'sess_1',
        transcript: 'Remove the last one',
        context: {
          cart: {
            items: [
              { id: 'item_3', name: 'Idli Sambar', quantity: 1, price: 40 },
              { id: 'item_1', name: 'Masala Dosa', quantity: 3, price: 70 },
            ],
          },
        },
      });

      // Does NOT destructively delete when ambiguous
      assert.equal(outcome.intent, 'clarify_removal_ambiguity');
      assert.equal(outcome.proposedActions?.length, 0);
      assert.ok(outcome.reply.includes('Did you mean remove 1 Masala Dosa'));
      assert.ok(outcome.reply.includes('or remove the entire line'));
    });

    it('Turn 4b: Explicit single unit removal reduces quantity by 1', async () => {
      const outcome = await processVoiceAssistantTurn({
        sessionId: 'sess_1',
        transcript: 'Remove one Masala Dosa',
        context: {
          cart: {
            items: [{ id: 'item_1', name: 'Masala Dosa', quantity: 3, price: 70 }],
          },
        },
      });

      assert.equal(outcome.intent, 'cart_reduce_quantity');
      assert.equal(outcome.proposedActions?.length, 1);
      assert.equal(outcome.proposedActions![0].type, 'cart_update_quantity');
      assert.equal((outcome.proposedActions![0].payload as any).quantity, 2);
    });

    it('Turn 4c: "Remove the last one" on single unit removes the line without ambiguity', async () => {
      const outcome = await processVoiceAssistantTurn({
        sessionId: 'sess_1',
        transcript: 'Remove the last one',
        context: {
          cart: {
            items: [{ id: 'item_1', name: 'Masala Dosa', quantity: 1, price: 70 }],
          },
        },
      });

      assert.equal(outcome.intent, 'cart_remove_item');
      assert.equal(outcome.proposedActions?.length, 1);
      assert.equal(outcome.proposedActions![0].type, 'cart_remove_item');
      assert.equal((outcome.proposedActions![0].payload as any).foodId, 'item_1');
    });

    it('Turn 5: "How much is total?" returns itemized cart total from committed cart', async () => {
      const outcome = await processVoiceAssistantTurn({
        sessionId: 'sess_1',
        transcript: 'How much is total?',
        context: {
          cart: {
            items: [{ id: 'item_3', name: 'Idli Sambar', quantity: 2, price: 40 }],
          },
          // Unconfirmed proposal must NOT inflate the cart total
          lastProposedItem: { id: 'item_1', name: 'Masala Dosa', quantity: 3, price: 70 },
        },
      });

      assert.equal(outcome.intent, 'cart_overview');
      // Committed cart is 2 * 40 = 80, NOT 80 + 210
      assert.ok(outcome.reply.includes('₹80'));
    });

    it('Clarifies ambiguity when user asks for a generic item matching multiple menu dishes', async () => {
      const outcome = await processVoiceAssistantTurn({
        sessionId: 'sess_1',
        transcript: 'I want a dosa',
        context: { menuItems: mockMenuItems },
      });

      assert.equal(outcome.intent, 'clarify_dish_choice');
      assert.ok(outcome.reply.includes('Masala Dosa'));
      assert.ok(outcome.reply.includes('Plain Dosa'));
    });
  });

  describe('Merchant Operations, Strict Authorization & Canonical Reporting', () => {
    it('blocks unauthenticated guest callers from merchant operations', async () => {
      const outcome = await processVoiceAssistantTurn({
        sessionId: 'sess_guest',
        transcript: 'Show me today sales',
        mode: 'merchant_ops',
        tenantId: 'tenant_123',
        userId: 'guest',
      });

      assert.equal(outcome.authorized, false);
      assert.equal(outcome.intent, 'unauthorized');
    });

    it('blocks authenticated non-owner users when assertOwnerTenantAccess throws 403', async () => {
      const mockAssertOwnerTenantAccess = async () => {
        const err = new Error('User not authorized for this tenant');
        (err as any).statusCode = 403;
        throw err;
      };

      const outcome = await processVoiceAssistantTurn(
        {
          sessionId: 'sess_customer',
          transcript: 'Show me today sales',
          mode: 'merchant_ops',
          tenantId: 'tenant_other_restaurant',
          userId: 'customer_uid_999',
        },
        { assertOwnerTenantAccess: mockAssertOwnerTenantAccess },
      );

      assert.equal(outcome.authorized, false);
      assert.equal(outcome.intent, 'unauthorized');
    });

    it('allows verified owner to view authoritative sales summary separating verified collections and receivables', async () => {
      const mockAssertOwnerTenantAccess = async () => 'tenant_my_restaurant';
      const chainableQuery: any = {};
      chainableQuery.where = () => chainableQuery;
      chainableQuery.get = async () => ({
        docs: [
          // Verified online payment
          {
            id: 'ord_1',
            data: () => ({
              totalAmount: 450,
              status: 'COMPLETED',
              paymentStatus: 'PAID',
              paymentMethod: 'UPI',
            }),
          },
          // Staff recorded counter cash payment
          {
            id: 'ord_2',
            data: () => ({
              totalAmount: 300,
              status: 'DELIVERED',
              paymentStatus: 'recorded',
              paymentMethod: 'CASH',
              paymentReceived: true,
            }),
          },
          // Unpaid order (Must NOT be counted in revenue)
          {
            id: 'ord_3',
            data: () => ({
              totalAmount: 200,
              status: 'PLACED',
              paymentStatus: 'pending',
              paymentMethod: 'COD',
            }),
          },
          // Completed order with unknown/unpaid status (shortcut removed: NOT counted in revenue)
          {
            id: 'ord_4',
            data: () => ({
              totalAmount: 180,
              status: 'COMPLETED',
              paymentStatus: 'unknown',
            }),
          },
        ],
      });
      const mockDb: any = {
        collection: () => chainableQuery,
      };

      const outcome = await processVoiceAssistantTurn(
        {
          sessionId: 'sess_owner',
          transcript: 'What are today sales?',
          mode: 'merchant_ops',
          tenantId: 'tenant_my_restaurant',
          userId: 'owner_uid_123',
        },
        {
          db: mockDb,
          assertOwnerTenantAccess: mockAssertOwnerTenantAccess,
        },
      );

      assert.equal(outcome.authorized, true);
      assert.equal(outcome.intent, 'owner_sales_summary');
      // Total revenue should be 450 + 300 = 750 (excluding 200 unpaid + 180 unknown)
      assert.ok(outcome.reply.includes('₹750'));
      assert.ok(outcome.reply.includes('2 paid orders'));
      // Unpaid count: 2 orders (ord_3 and ord_4)
      assert.ok(outcome.reply.includes('2 orders are pending payment'));
    });

    it('generates proposal-only when owner requests menu stock change', async () => {
      const mockAssertOwnerTenantAccess = async () => 'tenant_my_restaurant';

      const outcome = await processVoiceAssistantTurn(
        {
          sessionId: 'sess_owner',
          transcript: 'Mark Chicken Biryani as out of stock',
          mode: 'merchant_ops',
          tenantId: 'tenant_my_restaurant',
          userId: 'owner_uid_123',
        },
        { assertOwnerTenantAccess: mockAssertOwnerTenantAccess },
      );

      assert.equal(outcome.authorized, true);
      assert.equal(outcome.intent, 'owner_propose_stock_change');
      assert.equal(outcome.proposedActions?.length, 1);
      assert.equal(outcome.proposedActions![0].type, 'menu_stock_proposal');
      assert.equal((outcome.proposedActions![0].payload as any).isAvailable, false);
      assert.equal((outcome.proposedActions![0].payload as any).requiresConfirmation, true);
      assert.equal(
        (outcome.proposedActions![0].payload as any).navigationPath,
        '/owner/menu?tenantId=tenant_my_restaurant',
      );
      assert.ok(outcome.reply.includes('Proposal created'));
      assert.ok(outcome.reply.includes('proposal-only'));
      assert.ok(outcome.reply.includes('inventory screen'));
      assert.ok(outcome.reply.includes('confirm on your screen'));
    });
  });

  describe('Authoritative Reporting: Business Day & Payment Categories', () => {
    it('groups 23:30 and 01:30 overnight shift orders into the same operational business day', () => {
      // Overnight dinner shift: Oct 17 23:30 IST and Oct 18 01:30 IST
      const nightOrderTime = new Date('2026-10-17T23:30:00.000+05:30');
      const earlyMorningOrderTime = new Date('2026-10-18T01:30:00.000+05:30');

      const range1 = getIstBusinessDayRange(nightOrderTime, 4);
      const range2 = getIstBusinessDayRange(earlyMorningOrderTime, 4);

      assert.equal(range1.businessDate, '2026-10-17');
      assert.equal(range2.businessDate, '2026-10-17');
      assert.equal(range1.start.getTime(), range2.start.getTime());
      assert.equal(range1.end.getTime(), range2.end.getTime());
    });

    it('correctly handles failed, refunded, partial, and unknown payment statuses in getAuthoritativeDailySalesSummary', async () => {
      const q: any = {};
      q.where = () => q;
      q.get = async () => ({
        docs: [
          { id: '1', data: () => ({ totalAmount: 500, paymentStatus: 'paid', status: 'DELIVERED', paymentMethod: 'UPI' }) },
          { id: '2', data: () => ({ totalAmount: 200, paymentStatus: 'failed', status: 'FAILED' }) }, // Excluded
          { id: '3', data: () => ({ totalAmount: 150, paymentStatus: 'refunded', status: 'REFUNDED', refundAmount: 150 }) },
          { id: '4', data: () => ({ totalAmount: 300, paymentStatus: 'pending', status: 'PLACED' }) }, // Receivable
          { id: '5', data: () => ({ totalAmount: 100, paymentStatus: 'unknown', status: 'COMPLETED' }) }, // Receivable (shortcut removed)
        ],
      });
      const mockDb: any = {
        collection: () => q,
      };

      const summary = await getAuthoritativeDailySalesSummary(mockDb, 'tenant_1');
      assert.equal(summary.verifiedCollections, 500);
      assert.equal(summary.refundAmount, 150);
      assert.equal(summary.totalRevenue, 350); // 500 collections - 150 refund
      assert.equal(summary.receivables, 400); // 300 pending + 100 unknown
      assert.equal(summary.paidOrderCount, 1);
      assert.equal(summary.unpaidOrderCount, 2);
      assert.equal(summary.refundedOrderCount, 1);
    });
  });

  describe('Guest Order Tracking Authorization', () => {
    const testSecret = '0123456789abcdef0123456789abcdef';

    it('allows guest order tracking with a valid signed HMAC token', async () => {
      const targetOrderId = 'order_abc_123';
      const { token } = signGuestOrderToken(targetOrderId, { secret: testSecret });

      const mockDb: any = {
        collection: () => ({
          orderBy: () => ({
            limit: () => ({
              get: async () => ({
                empty: false,
                docs: [
                  {
                    id: targetOrderId,
                    data: () => ({
                      orderNumber: '1234',
                      status: 'PREPARING',
                      tenantId: 'tenant_1',
                    }),
                  },
                ],
              }),
            }),
          }),
        }),
      };

      const prevSecret = process.env.ORDER_GUEST_TOKEN_SECRET;
      process.env.ORDER_GUEST_TOKEN_SECRET = testSecret;

      try {
        const outcome = await processVoiceAssistantTurn(
          {
            sessionId: 'sess_guest',
            transcript: 'Where is my order?',
            mode: 'consumer_ordering',
            orderTrackingToken: token,
          },
          { db: mockDb },
        );

        assert.equal(outcome.authorized, true);
        assert.equal(outcome.intent, 'track_order');
        assert.ok(outcome.reply.includes('#1234'));
      } finally {
        process.env.ORDER_GUEST_TOKEN_SECRET = prevSecret;
      }
    });
  });
});
