/**
 * OrderBhojan product adapter for @bhojan/voice-core.
 * Injects existing validate/apply/cart readers — never mutates without confirm.
 */
import {
  createToolCallId,
  type AddItemToCartArgs,
  type CartSummary,
  type EscalateArgs,
  type FindMenuItemsArgs,
  type GetCartSummaryArgs,
  type MenuItemMatch,
  type VoicePlatformAdapter,
  type VoiceToolResult,
} from '@bhojan/voice-core';
import type { CartPlanValidationResult } from '@/features/assistant/domain/cartPlanContract';
import {
  applyConfirmedCartPlan,
  type ApplyConfirmedCartPlanDeps,
} from '@/features/cart/domain/applyConfirmedCartPlan';
import { useCartStore } from '@/features/cart/store/cartStore';
import { getCachedMenuItemsForSearch } from '@/features/search/store/searchMenuCacheStore';

export type OrderBhojanVoiceAdapterDeps = {
  readonly validateCartPlan: (input: {
    readonly itemName: string;
    readonly quantity: number;
    readonly kitchenHint?: string;
  }) => Promise<CartPlanValidationResult>;
  readonly cartMutators: ApplyConfirmedCartPlanDeps;
};

type PendingHolder = {
  plan: CartPlanValidationResult | null;
  planId: string | null;
};

export function createOrderBhojanVoiceAdapter(
  deps: OrderBhojanVoiceAdapterDeps,
): VoicePlatformAdapter & {
  readonly getPendingPlan: () => CartPlanValidationResult | null;
  readonly getPendingPlanId: () => string | null;
} {
  const pending: PendingHolder = { plan: null, planId: null };

  return {
    product: 'orderbhojan',

    getPendingPlan() {
      return pending.plan;
    },

    getPendingPlanId() {
      return pending.planId;
    },

    async findMenuItems(args: FindMenuItemsArgs): Promise<VoiceToolResult<readonly MenuItemMatch[]>> {
      const callId = createToolCallId();
      const cached = getCachedMenuItemsForSearch();
      const query = args.query.trim().toLowerCase();
      const data: MenuItemMatch[] = cached
        .filter((item) => {
          if (item.type !== 'food') return false;
          const name = String(item.label || '').toLowerCase();
          if (!query) return false;
          if (!name.includes(query) && !query.includes(name)) return false;
          const tenantId = item.meta?.tenantId;
          if (args.kitchenId && typeof tenantId === 'string' && tenantId !== args.kitchenId) {
            return false;
          }
          return true;
        })
        .slice(0, 8)
        .map((item) => ({
          itemId: String(item.id),
          name: String(item.label || 'Item'),
          kitchenId: String(
            (typeof item.meta?.tenantId === 'string' && item.meta.tenantId) ||
              args.kitchenId ||
              '',
          ),
          kitchenName:
            typeof item.meta?.restaurantName === 'string'
              ? item.meta.restaurantName
              : item.subtitle,
          price: typeof item.meta?.price === 'number' ? item.meta.price : undefined,
        }));

      return { ok: true, tool: 'findMenuItems', callId, data };
    },

    async proposeAddItemToCart(
      args: AddItemToCartArgs,
    ): Promise<
      VoiceToolResult<{
        readonly planId: string;
        readonly status: string;
        readonly valid?: boolean;
        readonly summarySpeech: string;
        readonly clarificationQuestion?: string;
      }>
    > {
      const callId = createToolCallId();
      try {
        const result = await deps.validateCartPlan({
          itemName: args.itemName,
          quantity: args.quantity,
          kitchenHint: args.kitchenHint,
        });
        const planId = `${result.conversationId || 'plan'}_${callId}`;
        pending.plan = result;
        pending.planId = planId;
        const summarySpeech =
          result.status === 'validated' && result.valid
            ? `I can add ${args.quantity} ${args.itemName}. Say confirm to add it to your cart.`
            : result.clarificationQuestions[0] ||
              result.issues[0]?.message ||
              'I need a bit more detail to add that item.';
        return {
          ok: true,
          tool: 'addItemToCart',
          callId,
          data: {
            planId,
            status: result.status,
            valid: result.valid,
            summarySpeech,
            clarificationQuestion: result.clarificationQuestions[0],
          },
        };
      } catch (error) {
        return {
          ok: false,
          tool: 'addItemToCart',
          callId,
          code: 'UPSTREAM_ERROR',
          message: error instanceof Error ? error.message : 'Could not validate cart add',
        };
      }
    },

    async confirmPendingChange(
      planId: string,
    ): Promise<VoiceToolResult<{ readonly applied: true }>> {
      const callId = createToolCallId();
      const plan = pending.plan;
      if (!plan || pending.planId !== planId) {
        return {
          ok: false,
          tool: 'confirmPendingChange',
          callId,
          code: 'NEEDS_CONFIRMATION',
          message: 'No validated cart change is waiting for confirmation.',
        };
      }
      if (plan.status !== 'validated' || plan.valid !== true) {
        return {
          ok: false,
          tool: 'confirmPendingChange',
          callId,
          code: 'NEEDS_CLARIFICATION',
          message: 'Resolve menu clarification before confirming.',
        };
      }

      const applied = applyConfirmedCartPlan({
        userConfirmed: true,
        validation: plan,
        deps: deps.cartMutators,
      });
      if (!applied.mutatedState) {
        return {
          ok: false,
          tool: 'confirmPendingChange',
          callId,
          code: 'UPSTREAM_ERROR',
          message: 'Cart change could not be applied.',
        };
      }
      pending.plan = null;
      pending.planId = null;
      return { ok: true, tool: 'confirmPendingChange', callId, data: { applied: true } };
    },

    async discardPendingChange(): Promise<VoiceToolResult<{ readonly discarded: true }>> {
      pending.plan = null;
      pending.planId = null;
      return {
        ok: true,
        tool: 'discardPendingChange',
        callId: createToolCallId(),
        data: { discarded: true },
      };
    },

    async getCartSummary(_args?: GetCartSummaryArgs): Promise<VoiceToolResult<CartSummary>> {
      const callId = createToolCallId();
      const cart = useCartStore.getState();
      const lines = cart.lines.map((line) => ({
        name: line.name,
        quantity: line.quantity,
        lineTotal: line.price * line.quantity,
      }));
      const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
      const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
      const spoken =
        itemCount === 0
          ? 'Your cart is empty.'
          : `You have ${itemCount} item${itemCount === 1 ? '' : 's'} in the cart, about ₹${Math.round(subtotal)}.`;
      return {
        ok: true,
        tool: 'getCartSummary',
        callId,
        data: {
          kitchenName: cart.restaurantSlug || undefined,
          itemCount,
          subtotal: itemCount ? subtotal : undefined,
          lines,
          spoken,
        },
      };
    },

    async escalateToHuman(
      args: EscalateArgs,
    ): Promise<VoiceToolResult<{ readonly handoffId: string }>> {
      const handoffId = `ho_${Date.now().toString(36)}`;
      return {
        ok: true,
        tool: 'escalateToHuman',
        callId: createToolCallId(),
        data: { handoffId },
      };
    },
  };
}
