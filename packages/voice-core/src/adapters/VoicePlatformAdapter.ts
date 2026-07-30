import type { VoiceSession } from '../session/VoiceSession.js';
import type {
  AddItemToCartArgs,
  EscalateArgs,
  FindMenuItemsArgs,
  GetCartSummaryArgs,
  VoiceToolResult,
} from '../tools/contracts.js';

export type CartSummaryLine = {
  readonly name: string;
  readonly quantity: number;
  readonly lineTotal?: number;
};

export type CartSummary = {
  readonly kitchenName?: string;
  readonly itemCount: number;
  readonly subtotal?: number;
  readonly lines: readonly CartSummaryLine[];
  readonly spoken: string;
};

export type MenuItemMatch = {
  readonly itemId: string;
  readonly name: string;
  readonly kitchenId: string;
  readonly kitchenName?: string;
  readonly price?: number;
};

/**
 * Product-specific capabilities. Shared core never reaches into cart stores directly.
 */
export interface VoicePlatformAdapter {
  readonly product: VoiceSession['product'];

  findMenuItems(args: FindMenuItemsArgs): Promise<VoiceToolResult<readonly MenuItemMatch[]>>;

  /** Validates a cart add — never mutates until confirmPendingChange. */
  proposeAddItemToCart(args: AddItemToCartArgs): Promise<
    VoiceToolResult<{
      readonly planId: string;
      readonly status: string;
      readonly valid?: boolean;
      readonly summarySpeech: string;
      readonly clarificationQuestion?: string;
    }>
  >;

  confirmPendingChange(planId: string): Promise<VoiceToolResult<{ readonly applied: true }>>;

  discardPendingChange(planId?: string): Promise<VoiceToolResult<{ readonly discarded: true }>>;

  getCartSummary(args?: GetCartSummaryArgs): Promise<VoiceToolResult<CartSummary>>;

  escalateToHuman(args: EscalateArgs): Promise<VoiceToolResult<{ readonly handoffId: string }>>;
}
