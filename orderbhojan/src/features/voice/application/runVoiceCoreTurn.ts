/**
 * Thin Phase-1 bridge: triage → platform adapter.
 * Mutating cart changes only apply after explicit confirm.
 */
import {
  emitVoiceTelemetry,
  triageVoiceUtterance,
  type ConfirmationSnapshot,
  type OrderingTaskSnapshot,
  type VoicePlatformAdapter,
  type VoiceSession,
} from '@bhojan/voice-core';

export type VoiceCoreTurnResult = {
  readonly confirmation: ConfirmationSnapshot;
  readonly spoken: string;
  readonly kind: string;
  readonly applied?: boolean;
};

export async function runVoiceCoreTurn(input: {
  readonly session: VoiceSession;
  readonly message: string;
  readonly confirmation: ConfirmationSnapshot;
  readonly task: OrderingTaskSnapshot;
  readonly adapter: VoicePlatformAdapter;
}): Promise<VoiceCoreTurnResult> {
  emitVoiceTelemetry({
    type: 'turn_started',
    sessionId: input.session.sessionId,
    conversationId: input.session.conversationId,
  });

  const { decision, confirmation } = triageVoiceUtterance({
    message: input.message,
    confirmation: input.confirmation,
    task: input.task,
  });

  switch (decision.kind) {
    case 'stop_agent':
      return {
        confirmation,
        spoken: 'Okay, stopping the voice assistant.',
        kind: decision.kind,
      };

    case 'apply_confirmed_change': {
      const result = await input.adapter.confirmPendingChange(decision.pending.planId);
      emitVoiceTelemetry({
        type: 'tool_called',
        sessionId: input.session.sessionId,
        tool: 'confirmPendingChange',
        callId: result.callId,
        ok: result.ok,
        ...(result.ok ? {} : { code: result.code }),
      });
      if (!result.ok) {
        return {
          confirmation,
          spoken: result.message,
          kind: decision.kind,
          applied: false,
        };
      }
      return {
        confirmation: { phase: 'none', pending: null },
        spoken:
          'Done. I added that to your cart. Voice is paused — tap the AI button anytime to order more.',
        kind: decision.kind,
        applied: true,
      };
    }

    case 'discard_pending':
      await input.adapter.discardPendingChange();
      return {
        confirmation,
        spoken: 'Okay, I cancelled that cart change.',
        kind: decision.kind,
      };

    case 'clarify':
      return {
        confirmation: decision.confirmation,
        spoken: decision.reply,
        kind: decision.kind,
      };

    case 'escalate': {
      const result = await input.adapter.escalateToHuman(decision.tool.args as never);
      emitVoiceTelemetry({
        type: 'tool_called',
        sessionId: input.session.sessionId,
        tool: 'escalateToHuman',
        callId: result.callId,
        ok: result.ok,
      });
      return {
        confirmation,
        spoken: decision.reply,
        kind: decision.kind,
      };
    }

    case 'propose_cart_add': {
      const result = await input.adapter.proposeAddItemToCart(
        decision.tool.args as {
          readonly itemName: string;
          readonly quantity: number;
          readonly kitchenHint?: string;
        },
      );
      emitVoiceTelemetry({
        type: 'tool_called',
        sessionId: input.session.sessionId,
        tool: 'addItemToCart',
        callId: result.callId,
        ok: result.ok,
        ...(result.ok ? {} : { code: result.code }),
      });
      if (!result.ok) {
        return { confirmation, spoken: result.message, kind: decision.kind };
      }
      return {
        confirmation,
        spoken: result.data.summarySpeech,
        kind: decision.kind,
      };
    }

    case 'cart_summary': {
      const result = await input.adapter.getCartSummary(
        decision.tool.args as { readonly cartId?: string },
      );
      emitVoiceTelemetry({
        type: 'tool_called',
        sessionId: input.session.sessionId,
        tool: 'getCartSummary',
        callId: result.callId,
        ok: result.ok,
      });
      if (!result.ok) {
        return { confirmation, spoken: result.message, kind: decision.kind };
      }
      return {
        confirmation,
        spoken: result.data.spoken,
        kind: decision.kind,
      };
    }

    case 'continue_llm':
    default:
      return {
        confirmation: decision.kind === 'continue_llm' ? decision.confirmation : confirmation,
        spoken: '',
        kind: 'continue_llm',
      };
  }
}
