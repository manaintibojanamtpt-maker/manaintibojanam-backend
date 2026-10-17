import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  processVoiceAssistantTurn,
  detectLanguage,
  extractQuantity,
  sanitizeTechnicalIds,
} from '../voiceTurnProcessor.js';

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

  describe('Multi-Turn Conversational Flow', () => {
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

    it('Turn 3: "One without onion" attaches customization note', async () => {
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

      assert.equal(outcome.intent, 'cart_update_notes');
      assert.equal(outcome.proposedActions?.length, 1);
      assert.equal(outcome.proposedActions![0].type, 'cart_update_notes');
      assert.equal((outcome.proposedActions![0].payload as any).foodId, 'item_1');
      assert.equal((outcome.proposedActions![0].payload as any).notes, 'One without onion');
      assert.ok(outcome.reply.includes('without onion'));
    });

    it('Turn 4: "Remove the last one" removes the last added item', async () => {
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

      assert.equal(outcome.intent, 'cart_remove_item');
      assert.equal(outcome.proposedActions?.length, 1);
      assert.equal(outcome.proposedActions![0].type, 'cart_remove_item');
      assert.equal((outcome.proposedActions![0].payload as any).foodId, 'item_1');
      assert.equal((outcome.proposedActions![0].payload as any).name, 'Masala Dosa');
      assert.ok(outcome.reply.includes('Masala Dosa'));
    });

    it('Turn 5: "How much is total?" returns itemized cart total', async () => {
      const outcome = await processVoiceAssistantTurn({
        sessionId: 'sess_1',
        transcript: 'How much is total?',
        context: {
          cart: {
            items: [{ id: 'item_3', name: 'Idli Sambar', quantity: 2, price: 40 }],
          },
        },
      });

      assert.equal(outcome.intent, 'cart_overview');
      assert.ok(outcome.reply.includes('₹80'));
      assert.ok(outcome.reply.includes('2x Idli Sambar'));
    });

    it('Clarifies ambiguity when user asks for a generic item matching multiple menu dishes', async () => {
      const outcome = await processVoiceAssistantTurn({
        sessionId: 'sess_1',
        transcript: 'Add dosa',
        language: 'en-IN',
        context: {
          menuItems: mockMenuItems, // Contains both "Masala Dosa" and "Plain Dosa"
        },
      });

      assert.equal(outcome.intent, 'clarify_dish_choice');
      assert.ok(outcome.reply.includes('Plain Dosa'));
      assert.ok(outcome.reply.includes('Masala Dosa'));
      assert.ok(outcome.reply.includes('Which one would you prefer'));
    });
  });

  describe('Merchant Operations & Strict Authorization', () => {
    it('blocks unauthenticated guest callers from merchant operations', async () => {
      const outcome = await processVoiceAssistantTurn({
        sessionId: 'sess_guest',
        transcript: 'What are today sales?',
        mode: 'merchant_ops',
        tenantId: 'tenant_biryani_house',
        userId: 'guest',
      });

      assert.equal(outcome.authorized, false);
      assert.equal(outcome.intent, 'unauthorized');
      assert.ok(outcome.reply.includes('requires an authenticated owner account'));
    });

    it('blocks authenticated non-owner users when assertOwnerTenantAccess throws 403', async () => {
      const mockAssertOwnerTenantAccess = async () => {
        throw new Error('User does not own tenant');
      };

      const outcome = await processVoiceAssistantTurn(
        {
          sessionId: 'sess_cust',
          transcript: 'Show today sales',
          mode: 'merchant_ops',
          tenantId: 'tenant_other_restaurant',
          userId: 'customer_uid_456',
        },
        { assertOwnerTenantAccess: mockAssertOwnerTenantAccess },
      );

      assert.equal(outcome.authorized, false);
      assert.equal(outcome.intent, 'unauthorized');
      assert.ok(outcome.reply.includes('Access denied'));
    });

    it('allows verified owner to view authoritative sales summary', async () => {
      const mockAssertOwnerTenantAccess = async () => 'tenant_my_restaurant';

      const mockDb: any = {
        collection: () => ({
          where: () => ({
            where: () => ({
              where: () => ({
                get: async () => ({
                  docs: [
                    {
                      data: () => ({
                        status: 'COMPLETED',
                        paymentStatus: 'PAID',
                        totalAmount: 450,
                        paymentMethod: 'UPI',
                      }),
                    },
                    {
                      data: () => ({
                        status: 'COMPLETED',
                        paymentStatus: 'PAID',
                        totalAmount: 300,
                        paymentMethod: 'CASH',
                      }),
                    },
                    {
                      data: () => ({
                        status: 'PENDING',
                        paymentStatus: 'UNPAID', // Unpaid order must NOT count towards revenue
                        totalAmount: 200,
                      }),
                    },
                  ],
                }),
              }),
            }),
          }),
        }),
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
      // Total revenue should be 450 + 300 = 750 (excluding 200 unpaid)
      assert.ok(outcome.reply.includes('₹750'));
      assert.ok(outcome.reply.includes('2 paid orders'));
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
      assert.ok(outcome.reply.includes('Proposal created'));
      assert.ok(outcome.reply.includes('confirm on your screen'));
    });
  });
});
