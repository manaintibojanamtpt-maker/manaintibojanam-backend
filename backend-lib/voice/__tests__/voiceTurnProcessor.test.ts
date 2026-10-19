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

  describe('Multilingual Ordering Intent & Multi-Item Clarification Preservation', () => {
    const biryaniMenu = [
      {
        id: 'hyderabadi_chicken_biryani',
        name: 'Hyderabadi Chicken Biryani',
        price: 299,
        isAvailable: true,
        variants: [
          { id: 'single', name: 'Single', price: 299 },
          { id: 'jumbo', name: 'Jumbo', price: 499 },
        ],
      },
      {
        id: 'paneer_biryani',
        name: 'Paneer Biryani',
        price: 219,
        isAvailable: true,
      },
      {
        id: 'special_raita',
        name: 'Special Raita',
        price: 49,
        isAvailable: true,
      },
    ];

    it('Telugu: "రెండు చికెన్ బిర్యానీలు కావాలి" successfully triggers ordering intent and variant choice', async () => {
      const outcome = await processVoiceAssistantTurn({
        sessionId: 'sess_te_order',
        transcript: 'రెండు చికెన్ బిర్యానీలు కావాలి',
        context: { menuItems: biryaniMenu, restaurantId: 'obr_demo_biryani_001' },
      });

      assert.equal(outcome.language, 'te-IN');
      assert.equal(outcome.intent, 'clarify_dish_choice');
      assert.ok(outcome.reply.includes('సింగిల్') || outcome.reply.includes('Single') || outcome.reply.includes('Jumbo'));
      assert.ok(outcome.pendingClarification);
      assert.equal(outcome.pendingClarification.pendingItems.length, 1);
      assert.equal(outcome.pendingClarification.pendingItems[0].quantity, 2);
      assert.equal(outcome.pendingClarification.pendingItems[0].foodId, 'hyderabadi_chicken_biryani');
    });

    it('Telugu flat item: "రెండు పన్నీర్ బిర్యానీలు కావాలి" directly proposes cart_add_plan with qty 2', async () => {
      const outcome = await processVoiceAssistantTurn({
        sessionId: 'sess_te_paneer',
        transcript: 'రెండు పన్నీర్ బిర్యానీలు కావాలి',
        context: { menuItems: biryaniMenu, restaurantId: 'obr_demo_biryani_001' },
      });

      assert.equal(outcome.language, 'te-IN');
      assert.equal(outcome.intent, 'cart_add_plan');
      assert.equal(outcome.proposedActions?.length, 1);
      assert.equal((outcome.proposedActions![0].payload as any).quantity, 2);
      assert.equal((outcome.proposedActions![0].payload as any).foodId, 'paneer_biryani');
      assert.ok(outcome.reply.includes('2 Paneer Biryani'));
    });

    it('Hindi: "दो चिकन बिरयानी चाहिए" successfully triggers ordering intent and variant choice', async () => {
      const outcome = await processVoiceAssistantTurn({
        sessionId: 'sess_hi_order',
        transcript: 'दो चिकन बिरयानी चाहिए',
        context: { menuItems: biryaniMenu, restaurantId: 'obr_demo_biryani_001' },
      });

      assert.equal(outcome.language, 'hi-IN');
      assert.equal(outcome.intent, 'clarify_dish_choice');
      assert.ok(outcome.reply.includes('Single') || outcome.reply.includes('Jumbo'));
      assert.ok(outcome.pendingClarification);
      assert.equal(outcome.pendingClarification.pendingItems.length, 1);
      assert.equal(outcome.pendingClarification.pendingItems[0].quantity, 2);
      assert.equal(outcome.pendingClarification.pendingItems[0].foodId, 'hyderabadi_chicken_biryani');
    });

    it('Hindi flat item: "दो पनीर बिरयानी चाहिए" directly proposes cart_add_plan with qty 2', async () => {
      const outcome = await processVoiceAssistantTurn({
        sessionId: 'sess_hi_paneer',
        transcript: 'दो पनीर बिरयानी चाहिए',
        context: { menuItems: biryaniMenu, restaurantId: 'obr_demo_biryani_001' },
      });

      assert.equal(outcome.language, 'hi-IN');
      assert.equal(outcome.intent, 'cart_add_plan');
      assert.equal(outcome.proposedActions?.length, 1);
      assert.equal((outcome.proposedActions![0].payload as any).quantity, 2);
      assert.equal((outcome.proposedActions![0].payload as any).foodId, 'paneer_biryani');
      assert.ok(outcome.reply.includes('2 Paneer Biryani'));
    });

    it('Multi-item clarification retention: "I want two chicken biryanis and one special raita" -> asks Single vs Jumbo -> "Jumbo" produces proposal with both items', async () => {
      // Turn 1: Initial multi-item request
      const turn1 = await processVoiceAssistantTurn({
        sessionId: 'sess_multi_clarify',
        transcript: 'I want two chicken biryanis and one special raita',
        context: { menuItems: biryaniMenu, restaurantId: 'obr_demo_biryani_001' },
      });

      assert.equal(turn1.intent, 'clarify_dish_choice');
      assert.ok(turn1.reply.includes('Single or Jumbo') || turn1.reply.includes('Single') && turn1.reply.includes('Jumbo'));
      assert.ok(turn1.pendingClarification);
      assert.equal(turn1.pendingClarification.pendingItems.length, 2);
      // Item 0: Chicken Biryani (needs variant, qty 2)
      assert.equal(turn1.pendingClarification.pendingItems[0].foodId, 'hyderabadi_chicken_biryani');
      assert.equal(turn1.pendingClarification.pendingItems[0].quantity, 2);
      assert.equal(turn1.pendingClarification.pendingItems[0].needsVariant, true);
      // Item 1: Special Raita (preserved with qty 1)
      assert.equal(turn1.pendingClarification.pendingItems[1].foodId, 'special_raita');
      assert.equal(turn1.pendingClarification.pendingItems[1].quantity, 1);
      assert.equal(turn1.pendingClarification.pendingItems[1].needsVariant, false);

      // Turn 2: User answers "Jumbo"
      const turn2 = await processVoiceAssistantTurn({
        sessionId: 'sess_multi_clarify',
        transcript: 'Jumbo',
        context: {
          menuItems: biryaniMenu,
          restaurantId: 'obr_demo_biryani_001',
          pendingClarification: turn1.pendingClarification,
        },
      });

      assert.equal(turn2.intent, 'cart_add_plan');
      assert.equal(turn2.proposedActions?.length, 2);

      // Action 0: 2x Jumbo Chicken Biryani @ ₹499 = ₹998
      const biryaniAction = turn2.proposedActions![0].payload as any;
      assert.equal(biryaniAction.foodId, 'hyderabadi_chicken_biryani');
      assert.equal(biryaniAction.quantity, 2);
      assert.equal(biryaniAction.price, 499);
      assert.ok(biryaniAction.name.includes('Jumbo'));

      // Action 1: 1x Special Raita @ ₹49
      const raitaAction = turn2.proposedActions![1].payload as any;
      assert.equal(raitaAction.foodId, 'special_raita');
      assert.equal(raitaAction.quantity, 1);
      assert.equal(raitaAction.price, 49);

      // Total ₹1,047 verified in reply
      assert.ok(turn2.reply.includes('1,047') || turn2.reply.includes('1047'));
      assert.ok(turn2.reply.includes('2 Hyderabadi Chicken Biryani (Jumbo)'));
      assert.ok(turn2.reply.includes('1 Special Raita'));
      assert.ok(turn2.reply.startsWith('Your proposed order is'));
      assert.ok(turn2.reply.endsWith('Confirm to add these to your cart.'));
      assert.ok(!turn2.reply.includes("I've added"));
    });

    it('Telugu: pre-confirmation proposal wording with multi-item and variant resolution', async () => {
      const turn1 = await processVoiceAssistantTurn({
        sessionId: 'sess_te_multi',
        transcript: 'నాకు రెండు చికెన్ బిర్యానీలు మరియు ఒక స్పెషల్ రైతా కావాలి',
        context: { menuItems: biryaniMenu, restaurantId: 'obr_demo_biryani_001' },
      });
      assert.equal(turn1.language, 'te-IN');
      assert.equal(turn1.intent, 'clarify_dish_choice');
      assert.ok(turn1.pendingClarification);

      const turn2 = await processVoiceAssistantTurn({
        sessionId: 'sess_te_multi',
        transcript: 'జంబో',
        context: {
          menuItems: biryaniMenu,
          restaurantId: 'obr_demo_biryani_001',
          pendingClarification: turn1.pendingClarification,
        },
      });
      assert.equal(turn2.language, 'te-IN');
      assert.equal(turn2.intent, 'cart_add_plan');
      assert.ok(turn2.reply.startsWith('మీ ప్రతిపాదిత ఆర్డర్:'));
      assert.ok(turn2.reply.includes('వీటిని మీ కార్ట్‌కి చేర్చడానికి నిర్ధారించండి.'));
      assert.ok(!turn2.reply.includes('చేసాము'));
      assert.ok(turn2.reply.includes('1,047'));
    });

    it('Hindi: pre-confirmation proposal wording with multi-item and variant resolution', async () => {
      const turn1 = await processVoiceAssistantTurn({
        sessionId: 'sess_hi_multi',
        transcript: 'मुझे दो चिकन बिरयानी और एक स्पेशल रायता चाहिए',
        context: { menuItems: biryaniMenu, restaurantId: 'obr_demo_biryani_001' },
      });
      assert.equal(turn1.language, 'hi-IN');
      assert.equal(turn1.intent, 'clarify_dish_choice');
      assert.ok(turn1.pendingClarification);

      const turn2 = await processVoiceAssistantTurn({
        sessionId: 'sess_hi_multi',
        transcript: 'जंबो',
        context: {
          menuItems: biryaniMenu,
          restaurantId: 'obr_demo_biryani_001',
          pendingClarification: turn1.pendingClarification,
        },
      });
      assert.equal(turn2.language, 'hi-IN');
      assert.equal(turn2.intent, 'cart_add_plan');
      assert.ok(turn2.reply.startsWith('आपका प्रस्तावित ऑर्डर है:'));
      assert.ok(turn2.reply.includes('इन्हें अपने कार्ट में जोड़ने के लिए कन्फर्म करें।'));
      assert.ok(!turn2.reply.includes('जोड़ दिए'));
      assert.ok(turn2.reply.includes('1,047'));
    });

    it('Cancellation clears pendingClarification and prevents "Jumbo" from reviving cancelled order', async () => {
      const turn1 = await processVoiceAssistantTurn({
        sessionId: 'sess_cancel_test',
        transcript: 'I want two chicken biryanis and one special raita',
        restaurantId: 'obr_demo_biryani_001',
        context: { menuItems: biryaniMenu, restaurantId: 'obr_demo_biryani_001' },
      });
      assert.ok(turn1.pendingClarification);

      // Explicit cancellation turn
      const turn2 = await processVoiceAssistantTurn({
        sessionId: 'sess_cancel_test',
        transcript: 'cancel order',
        restaurantId: 'obr_demo_biryani_001',
        context: {
          menuItems: biryaniMenu,
          restaurantId: 'obr_demo_biryani_001',
          pendingClarification: turn1.pendingClarification,
        },
      });
      assert.equal(turn2.intent, 'cancel_order');
      assert.equal(turn2.pendingClarification, null);
      assert.deepEqual(turn2.proposedActions, [{ type: 'clear_proposal' }]);

      // Subsequent turn saying "Jumbo" must NOT produce a cart proposal
      const turn3 = await processVoiceAssistantTurn({
        sessionId: 'sess_cancel_test',
        transcript: 'Jumbo',
        restaurantId: 'obr_demo_biryani_001',
        context: {
          menuItems: biryaniMenu,
          restaurantId: 'obr_demo_biryani_001',
          pendingClarification: turn2.pendingClarification,
        },
      });
      assert.notEqual(turn3.intent, 'cart_add_plan');
      assert.equal(turn3.proposedActions, undefined);
    });

    it('Scope isolation: pendingClarification is dropped if restaurantId or userId changes', async () => {
      const turn1 = await processVoiceAssistantTurn({
        sessionId: 'sess_scope_1',
        restaurantId: 'obr_demo_biryani_001',
        userId: 'user_alpha',
        transcript: 'two chicken biryanis',
        context: { menuItems: biryaniMenu, restaurantId: 'obr_demo_biryani_001' },
      });
      assert.ok(turn1.pendingClarification);
      assert.equal(turn1.pendingClarification.restaurantId, 'obr_demo_biryani_001');
      assert.equal(turn1.pendingClarification.userId, 'user_alpha');

      // Attempt turn 2 with mismatched restaurantId
      const turn2DiffRestaurant = await processVoiceAssistantTurn({
        sessionId: 'sess_scope_1',
        restaurantId: 'obr_other_kitchen',
        userId: 'user_alpha',
        transcript: 'Jumbo',
        context: {
          menuItems: biryaniMenu,
          restaurantId: 'obr_other_kitchen',
          pendingClarification: turn1.pendingClarification,
        },
      });
      assert.notEqual(turn2DiffRestaurant.intent, 'cart_add_plan');

      // Attempt turn 2 with mismatched userId
      const turn2DiffUser = await processVoiceAssistantTurn({
        sessionId: 'sess_scope_1',
        restaurantId: 'obr_demo_biryani_001',
        userId: 'user_beta',
        transcript: 'Jumbo',
        context: {
          menuItems: biryaniMenu,
          restaurantId: 'obr_demo_biryani_001',
          pendingClarification: turn1.pendingClarification,
        },
      });
      assert.notEqual(turn2DiffUser.intent, 'cart_add_plan');
    });

    it('Interruption: "stop speaking" / "stop" halts speech but preserves proposal and pendingClarification', async () => {
      // Turn 1: Ask for biryani
      const turn1 = await processVoiceAssistantTurn({
        sessionId: 'sess_stop_test',
        transcript: 'I want two chicken biryanis and one special raita',
        restaurantId: 'obr_demo_biryani_001',
        context: { menuItems: biryaniMenu, restaurantId: 'obr_demo_biryani_001' },
      });
      assert.ok(turn1.pendingClarification);

      // Turn 2: User says "stop speaking" (interruption)
      const turn2 = await processVoiceAssistantTurn({
        sessionId: 'sess_stop_test',
        transcript: 'stop speaking',
        restaurantId: 'obr_demo_biryani_001',
        context: {
          menuItems: biryaniMenu,
          restaurantId: 'obr_demo_biryani_001',
          pendingClarification: turn1.pendingClarification,
        },
      });
      assert.equal(turn2.intent, 'stop_speaking');
      assert.equal(turn2.reply, '');
      assert.equal(turn2.proposedActions, undefined); // Does NOT clear proposal!
      assert.ok(turn2.pendingClarification); // Preserves clarification!

      // Turn 3: User answers "Jumbo" -> MUST resolve successfully into cart proposal!
      const turn3 = await processVoiceAssistantTurn({
        sessionId: 'sess_stop_test',
        transcript: 'Jumbo',
        restaurantId: 'obr_demo_biryani_001',
        context: {
          menuItems: biryaniMenu,
          restaurantId: 'obr_demo_biryani_001',
          pendingClarification: turn2.pendingClarification,
        },
      });
      assert.equal(turn3.intent, 'cart_add_plan');
      assert.equal(turn3.proposedActions?.length, 2);
      assert.ok(turn3.reply.includes('1,047'));
    });

    it('Native script cancellation: Telugu "వద్దు" and Hindi "नहीं चाहिए" clear proposal and clarification', async () => {
      // Telugu native cancellation
      const teTurn1 = await processVoiceAssistantTurn({
        sessionId: 'sess_te_native_cancel',
        transcript: 'రెండు చికెన్ బిర్యానీలు కావాలి',
        context: { menuItems: biryaniMenu, restaurantId: 'obr_demo_biryani_001' },
      });
      assert.ok(teTurn1.pendingClarification);

      const teTurn2 = await processVoiceAssistantTurn({
        sessionId: 'sess_te_native_cancel',
        transcript: 'వద్దు',
        context: {
          menuItems: biryaniMenu,
          restaurantId: 'obr_demo_biryani_001',
          pendingClarification: teTurn1.pendingClarification,
        },
      });
      assert.equal(teTurn2.intent, 'cancel_order');
      assert.equal(teTurn2.pendingClarification, null);
      assert.deepEqual(teTurn2.proposedActions, [{ type: 'clear_proposal' }]);
      assert.ok(teTurn2.reply.includes('రద్దు చేయబడింది'));

      // Hindi native cancellation
      const hiTurn1 = await processVoiceAssistantTurn({
        sessionId: 'sess_hi_native_cancel',
        transcript: 'दो चिकन बिरयानी चाहिए',
        context: { menuItems: biryaniMenu, restaurantId: 'obr_demo_biryani_001' },
      });
      assert.ok(hiTurn1.pendingClarification);

      const hiTurn2 = await processVoiceAssistantTurn({
        sessionId: 'sess_hi_native_cancel',
        transcript: 'नहीं चाहिए',
        context: {
          menuItems: biryaniMenu,
          restaurantId: 'obr_demo_biryani_001',
          pendingClarification: hiTurn1.pendingClarification,
        },
      });
      assert.equal(hiTurn2.intent, 'cancel_order');
      assert.equal(hiTurn2.pendingClarification, null);
      assert.deepEqual(hiTurn2.proposedActions, [{ type: 'clear_proposal' }]);
      assert.ok(hiTurn2.reply.includes('रद्द कर दिया गया है'));
    });

    it('Authoritative menu options: asking unavailable variant ("Jumbo" on Half/Full menu) clarifies available options and preserves pendingClarification', async () => {
      const liveSeededMenu = [
        {
          id: 'item_cb_001',
          name: 'Hyderabadi Chicken Biryani',
          price: 299,
          offerPrice: 249,
          isAvailable: true,
          variants: [
            { variantId: 'v-half', kind: 'half', displayName: 'Half', price: 199, offerPrice: 169, isAvailable: true },
            { variantId: 'v-full', kind: 'full', displayName: 'Full', price: 299, offerPrice: 249, isAvailable: true },
            { variantId: 'v-jumbo', kind: 'jumbo', displayName: 'Jumbo', price: 399, isAvailable: false },
          ],
        },
        {
          id: 'item_raita_001',
          name: 'Special Raita',
          price: 49,
          isAvailable: true,
        },
      ];

      // Turn 1: User asks for 2 chicken biryanis
      const turn1 = await processVoiceAssistantTurn({
        sessionId: 'sess_live_variant',
        transcript: 'I want two chicken biryanis',
        context: { menuItems: liveSeededMenu, restaurantId: 'demo-biryani-house' },
      });
      assert.equal(turn1.intent, 'clarify_dish_choice');
      assert.ok(turn1.reply.includes('Half or Full'));
      assert.ok(turn1.pendingClarification);

      // Turn 2: User requests unavailable variant "Jumbo"
      const turn2 = await processVoiceAssistantTurn({
        sessionId: 'sess_live_variant',
        transcript: 'Jumbo',
        context: {
          menuItems: liveSeededMenu,
          restaurantId: 'demo-biryani-house',
          pendingClarification: turn1.pendingClarification,
        },
      });
      assert.equal(turn2.intent, 'clarify_dish_choice');
      assert.ok(turn2.reply.includes('We only have Half or Full'));
      // Must PRESERVE pendingClarification rather than silently mapping or dropping
      assert.ok(turn2.pendingClarification);
      assert.equal(turn2.pendingClarification?.pendingItems[0].needsVariant, true);

      // Turn 3: User chooses available variant "Full" -> honors offer price ₹249 ($2 \times 249 = ₹498$)
      const turn3 = await processVoiceAssistantTurn({
        sessionId: 'sess_live_variant',
        transcript: 'Full',
        context: {
          menuItems: liveSeededMenu,
          restaurantId: 'demo-biryani-house',
          pendingClarification: turn2.pendingClarification,
        },
      });
      assert.equal(turn3.intent, 'cart_add_plan');
      assert.equal(turn3.proposedActions?.length, 1);
      const action = turn3.proposedActions![0].payload as any;
      assert.equal(action.foodId, 'item_cb_001');
      assert.equal(action.quantity, 2);
      assert.equal(action.price, 249); // Must use offerPrice 249, NOT regular price 299 or fixture 499
      assert.equal(action.variantId, 'v-full');
      assert.ok(turn3.reply.includes('498'));

      // Turn 4: User says "Add one special raita as well" -> preserves unconfirmed biryani proposal, total ₹547
      const turn4 = await processVoiceAssistantTurn({
        sessionId: 'sess_live_variant',
        transcript: 'Add one special raita as well',
        context: {
          menuItems: liveSeededMenu,
          restaurantId: 'demo-biryani-house',
          currentProposal: turn3.proposedActions?.map((a) => a.payload as any),
        },
      });
      assert.equal(turn4.intent, 'cart_add_plan');
      assert.equal(turn4.proposedActions?.length, 2);
      const items = turn4.proposedActions!.map((a) => a.payload as any);
      assert.equal(items[0].name, 'Hyderabadi Chicken Biryani (Full)');
      assert.equal(items[0].quantity, 2);
      assert.equal(items[0].price, 249);
      assert.equal(items[1].name, 'Special Raita');
      assert.equal(items[1].quantity, 1);
      assert.equal(items[1].price, 49);
      // Total 2x249 + 1x49 = 547
      assert.ok(turn4.reply.includes('547'));
      assert.ok(turn4.reply.includes('2 Hyderabadi Chicken Biryani (Full)'));
      assert.ok(turn4.reply.includes('1 Special Raita'));
    });

    it('Telugu: Authoritative menu variant clarification, offer pricing, and proposal retention', async () => {
      const liveSeededMenu = [
        {
          id: 'item_cb_001',
          name: 'Hyderabadi Chicken Biryani',
          price: 299,
          offerPrice: 249,
          isAvailable: true,
          variants: [
            { variantId: 'v-half', kind: 'half', displayName: 'Half', price: 199, offerPrice: 169 },
            { variantId: 'v-full', kind: 'full', displayName: 'Full', price: 299, offerPrice: 249 },
          ],
        },
        {
          id: 'item_raita_001',
          name: 'Special Raita',
          price: 49,
          isAvailable: true,
        },
      ];

      // Turn 1: "రెండు చికెన్ బిర్యానీలు కావాలి"
      const turn1 = await processVoiceAssistantTurn({
        sessionId: 'sess_te_live',
        transcript: 'రెండు చికెన్ బిర్యానీలు కావాలి',
        context: { menuItems: liveSeededMenu, restaurantId: 'demo-biryani-house' },
      });
      assert.equal(turn1.language, 'te-IN');
      assert.equal(turn1.intent, 'clarify_dish_choice');
      assert.ok(turn1.pendingClarification);

      // Turn 2: User says "జంబో" (Jumbo) -> unavailable variant
      const turn2 = await processVoiceAssistantTurn({
        sessionId: 'sess_te_live',
        transcript: 'జంబో',
        context: {
          menuItems: liveSeededMenu,
          restaurantId: 'demo-biryani-house',
          pendingClarification: turn1.pendingClarification,
        },
      });
      assert.equal(turn2.intent, 'clarify_dish_choice');
      assert.ok(turn2.reply.includes('Half or Full మాత్రమే అందుబాటులో ఉన్నాయి'));
      assert.ok(turn2.pendingClarification);

      // Turn 3: User says "ఫుల్" (Full) -> resolves to 2x Full @ ₹249 = ₹498
      const turn3 = await processVoiceAssistantTurn({
        sessionId: 'sess_te_live',
        transcript: 'ఫుల్',
        context: {
          menuItems: liveSeededMenu,
          restaurantId: 'demo-biryani-house',
          pendingClarification: turn2.pendingClarification,
        },
      });
      assert.equal(turn3.intent, 'cart_add_plan');
      assert.ok(turn3.reply.includes('498'));

      // Turn 4: "ఒక స్పెషల్ రైతా కూడా కావాలి" -> combined proposal ₹547
      const turn4 = await processVoiceAssistantTurn({
        sessionId: 'sess_te_live',
        transcript: 'ఒక స్పెషల్ రైతా కూడా కావాలి',
        context: {
          menuItems: liveSeededMenu,
          restaurantId: 'demo-biryani-house',
          currentProposal: turn3.proposedActions?.map((a) => a.payload as any),
        },
      });
      assert.equal(turn4.intent, 'cart_add_plan');
      assert.equal(turn4.proposedActions?.length, 2);
      assert.ok(turn4.reply.includes('547'));
      assert.ok(turn4.reply.includes('2 Hyderabadi Chicken Biryani (Full)'));
      assert.ok(turn4.reply.includes('1 Special Raita'));
    });

    describe('Variant Handling Contracts (Zero, Single, Multiple, Post-Proposal)', () => {
      const testMenu = [
        {
          id: 'item_zero_var',
          name: 'Zero Variant Biryani',
          price: 250,
          isAvailable: true,
          variants: [
            { id: 'v1', name: 'Small', price: 150, isAvailable: false },
            { id: 'v2', name: 'Large', price: 250, isAvailable: false },
          ],
        },
        {
          id: 'item_single_var',
          name: 'Single Variant Curry',
          price: 200,
          offerPrice: 180,
          isAvailable: true,
          variants: [
            { id: 'v_only', name: 'Standard', price: 200, offerPrice: 175, isAvailable: true },
            { id: 'v_out', name: 'Extra Large', price: 300, isAvailable: false },
          ],
        },
        {
          id: 'item_multi_var',
          name: 'Multi Variant Pulao',
          price: 220,
          isAvailable: true,
          variants: [
            { id: 'v_half', name: 'Half', price: 120, isAvailable: true },
            { id: 'v_full', name: 'Full', price: 220, isAvailable: true },
            { id: 'v_jumbo', name: 'Jumbo', price: 320, isAvailable: false },
          ],
        },
      ];

      it('Case 1: Zero available variants cannot be proposed or purchased', async () => {
        const turn = await processVoiceAssistantTurn({
          sessionId: 'test_zero_var',
          transcript: 'Zero Variant Biryani కావాలి',
          language: 'te-IN',
          context: { menuItems: testMenu, restaurantId: 'r1' },
        });
        assert.equal(turn.intent, 'item_unavailable');
        assert.ok(turn.reply.includes('ప్రస్తుతం అందుబాటులో లేదు'));
        assert.equal(turn.proposedActions, undefined);
      });

      it('Case 2: Exactly one available variant preserves its ID and effective price without clarification', async () => {
        const turn = await processVoiceAssistantTurn({
          sessionId: 'test_single_var',
          transcript: 'I want one Single Variant Curry',
          language: 'en-IN',
          context: { menuItems: testMenu, restaurantId: 'r1' },
        });
        assert.equal(turn.intent, 'cart_add_plan');
        assert.equal(turn.proposedActions?.length, 1);
        const action = turn.proposedActions![0].payload as any;
        assert.equal(action.foodId, 'item_single_var');
        assert.equal(action.variantId, 'v_only');
        assert.equal(action.price, 175); // effective offerPrice of the single available variant
        assert.ok(turn.reply.includes('175'));
      });

      it('Case 3: Multiple available variants clarifies using available choices only', async () => {
        const turn = await processVoiceAssistantTurn({
          sessionId: 'test_multi_var',
          transcript: 'Multi Variant Pulao కావాలి',
          language: 'te-IN',
          context: { menuItems: testMenu, restaurantId: 'r1' },
        });
        assert.equal(turn.intent, 'clarify_dish_choice');
        assert.ok(turn.pendingClarification);
        const clarifyingItem = turn.pendingClarification.pendingItems[0];
        const optionNames = clarifyingItem.variantOptions?.map((o) => o.name);
        assert.deepEqual(optionNames, ['Half', 'Full']); // Jumbo excluded because isAvailable is false
        assert.ok(turn.reply.includes('Half or Full'));
        assert.ok(!turn.reply.includes('Jumbo'));
      });

      it('Case 4: A variant becoming unavailable after proposal is rejected/requoted safely', async () => {
        // Prior proposal had Multi Variant Pulao (Half @ 120) and Single Variant Curry (Standard @ 175)
        const currentProposal = [
          { foodId: 'item_multi_var', name: 'Multi Variant Pulao (Half)', quantity: 1, price: 120, variantId: 'v_half' },
        ];

        // Now stock changes: Multi Variant Pulao (Half) becomes unavailable!
        const updatedMenu = [
          {
            id: 'item_multi_var',
            name: 'Multi Variant Pulao',
            price: 220,
            isAvailable: true,
            variants: [
              { id: 'v_half', name: 'Half', price: 120, isAvailable: false }, // NOW UNAVAILABLE
              { id: 'v_full', name: 'Full', price: 220, isAvailable: true },
            ],
          },
          {
            id: 'item_single_var',
            name: 'Single Variant Curry',
            price: 200,
            offerPrice: 175,
            isAvailable: true,
            variants: [
              { id: 'v_only', name: 'Standard', price: 200, offerPrice: 175, isAvailable: true },
            ],
          },
        ];

        // User speaks to add Single Variant Curry
        const turn = await processVoiceAssistantTurn({
          sessionId: 'test_requote',
          transcript: 'I want one Single Variant Curry',
          language: 'en-IN',
          context: { menuItems: updatedMenu, restaurantId: 'r1', currentProposal },
        });

        assert.equal(turn.intent, 'cart_add_plan');
        // The unavailable Pulao was dropped from the proposal
        assert.equal(turn.proposedActions?.length, 1);
        const action = turn.proposedActions![0].payload as any;
        assert.equal(action.foodId, 'item_single_var');
        assert.equal(action.price, 175);
        // Notice prefix informs user that previously proposed item became unavailable
        assert.ok(turn.reply.includes('Multi Variant Pulao (Half) is now unavailable'));
        assert.ok(turn.reply.includes('175'));
      });
    });
  });
});
