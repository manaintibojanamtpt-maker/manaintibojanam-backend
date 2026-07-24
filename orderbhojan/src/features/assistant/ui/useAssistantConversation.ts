import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { applyConfirmedCartPlan } from '@/features/cart/domain/applyConfirmedCartPlan';
import { useCartStore } from '@/features/cart/store/cartStore';
import { useActiveLocation } from '@/features/location';
import { resolveRestaurantCoords } from '@/features/restaurant/engine/restaurantExperienceLayer';
import { useRestaurantContextStore } from '@/features/restaurant/store/restaurantContextStore';
import { notifyToast } from '@/shared/providers/BdsToastProvider';
import { openExternalUrl } from '@/lib/nativePlatform';
import { ensureRestaurantContextForCartPlan } from '../application/ensureRestaurantContextForCartPlan';
import type { CartPlanAction, CartPlanValidationResult } from '../domain/cartPlanContract';
import {
  buildCartAddPlansFromReorder,
  pickUsualReorderSource,
} from '../domain/buildPersonalizationCartPlans';
import { buildPersonalizationGuidance } from '../domain/buildPersonalizationGuidance';
import { buildPostOrderTriageGuidance } from '../domain/buildPostOrderTriageGuidance';
import {
  classifyPersonalizationIntent,
  isPersonalizationCartIntent,
} from '../domain/isPersonalizationUserMessage';
import { isPostOrderUserMessage } from '../domain/isPostOrderUserMessage';
import { useAiPostOrderFeature } from '../hooks/useAiPostOrderFeature';
import { useAiVoiceFeature } from '../hooks/useAiVoiceFeature';
import { useAiVoiceTtsFeature } from '../hooks/useAiVoiceTtsFeature';
import { useAssistantPersonalizationContext } from '../hooks/useAssistantPersonalizationContext';
import { useAssistantPostOrderContext } from '../hooks/useAssistantPostOrderContext';
import { useConsumerAssist } from '../hooks/useConsumerAssist';
import { usePostOrderAssist } from '../hooks/usePostOrderAssist';
import { useValidateCartPlan } from '../hooks/useValidateCartPlan';
import { getAssistantApiClient } from '../infrastructure/assistantApiClient';
import { captureVoiceTranscript, isVoiceCaptureAvailable } from '../infrastructure/voiceSpeechCapture';
import { speakVoiceConfirmation } from '../infrastructure/voiceSpeechSynthesis';
import { AssistantApiError, type ConsumerAssistHint } from '../types';

/** Best-effort audit; never blocks confirm/discard UX. */
function reportCartPlanDecisionQuietly(params: {
  readonly decision: 'confirm' | 'discard';
  readonly conversationId?: string;
  readonly planCount?: number;
}): void {
  void getAssistantApiClient()
    .reportCartPlanDecision(params)
    .catch(() => {
      /* intentional: audit must not affect cart confirm/deny UX */
    });
}

function mergeAssistHints(
  primary: readonly ConsumerAssistHint[],
  secondary: readonly ConsumerAssistHint[],
): readonly ConsumerAssistHint[] {
  const seen = new Set<string>();
  const out: ConsumerAssistHint[] = [];
  for (const hint of [...primary, ...secondary]) {
    if (hint.type === 'none') continue;
    const key = `${hint.type}:${hint.target ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(hint);
  }
  return out;
}

export interface AssistantThreadMessage {
  readonly id: string;
  readonly role: 'user' | 'assistant' | 'system';
  readonly text: string;
  readonly hints?: readonly ConsumerAssistHint[];
  readonly cartActions?: readonly CartPlanAction[];
  readonly validation?: CartPlanValidationResult;
}

function nextId(): string {
  return `ob_ai_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function useAssistantConversation() {
  const { ask } = useConsumerAssist();
  const { ask: askPostOrder, enabled: postOrderAssistEnabled } = usePostOrderAssist();
  const postOrderFlag = useAiPostOrderFeature();
  const orderContext = useAssistantPostOrderContext();
  const { enabled: personalizationEnabled, bootstrap: personalizationBootstrap } =
    useAssistantPersonalizationContext();
  const { validate } = useValidateCartPlan();
  const voiceEnabled = useAiVoiceFeature();
  const ttsEnabled = useAiVoiceTtsFeature();
  const navigate = useNavigate();
  const restaurantId = useRestaurantContextStore((s) => s.restaurantId);
  const addItem = useCartStore((s) => s.addItem);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const activeLocation = useActiveLocation();

  const postOrderMode = postOrderFlag && (Boolean(orderContext?.orderId) || Boolean(orderContext?.snapshot));

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<readonly AssistantThreadMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingValidation, setPendingValidation] = useState<CartPlanValidationResult | null>(null);
  const voiceAbortRef = useRef<AbortController | null>(null);
  const pendingPlanRestaurantRef = useRef<{
    restaurantId: string;
    restaurantSlug: string;
  } | null>(null);

  const voiceAvailable = useMemo(() => isVoiceCaptureAvailable(), []);

  const send = useCallback(
    async (raw: string): Promise<string | undefined> => {
      const message = raw.trim();
      if (!message || loading) return undefined;

      setError(null);
      setPendingValidation(null);
      pendingPlanRestaurantRef.current = null;
      setMessages((prev) => [...prev, { id: nextId(), role: 'user', text: message }]);
      setLoading(true);

      try {
        const personalizationIntent = classifyPersonalizationIntent(message);
        const reorderSource = pickUsualReorderSource({
          bootstrapReorder: personalizationBootstrap?.reorder,
          activeRestaurantId:
            personalizationIntent === 'usual_at_restaurant'
              ? restaurantId ?? personalizationBootstrap?.activeRestaurantId
              : personalizationBootstrap?.reorder?.restaurantId ?? restaurantId,
        });
        // For reorder_last, prefer bootstrap reorder even if restaurant differs.
        const effectiveReorder =
          personalizationIntent === 'reorder_last'
            ? personalizationBootstrap?.reorder
            : reorderSource;

        const usePersonalizationCartPath =
          personalizationEnabled &&
          isPersonalizationCartIntent(personalizationIntent) &&
          Boolean(effectiveReorder?.items.length);

        const usePersonalizationGuidancePath =
          personalizationEnabled &&
          personalizationIntent !== 'none' &&
          !usePersonalizationCartPath;

        if (usePersonalizationCartPath && effectiveReorder) {
          const cartActions = buildCartAddPlansFromReorder(effectiveReorder, {
            reason:
              personalizationIntent === 'usual_at_restaurant'
                ? 'personalization_usual'
                : 'personalization_reorder',
          });
          const kitchenLabel = effectiveReorder.orderNumber
            ? `order ${effectiveReorder.orderNumber}`
            : 'your recent order';
          const reply = `I prepared a reviewable cart plan from ${kitchenLabel}. Availability and substitutions are checked next — nothing is added until you confirm.`;

          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: 'assistant',
              text: reply,
              cartActions,
            },
          ]);

          pendingPlanRestaurantRef.current = {
            restaurantId: effectiveReorder.restaurantId,
            restaurantSlug: effectiveReorder.restaurantSlug,
          };

          setValidating(true);
          try {
            const validation = await validate({
              restaurantId: effectiveReorder.restaurantId,
              proposedActions: cartActions,
              ...(conversationId ? { conversationId } : {}),
            });
            setPendingValidation(validation);
            setMessages((prev) => [
              ...prev,
              {
                id: nextId(),
                role: 'system',
                text:
                  validation.status === 'validated'
                    ? 'Cart plan validated from your past order. Review and confirm to apply.'
                    : validation.status === 'needs_clarification'
                      ? 'Some items need clarification (availability, size, or substitution) before apply.'
                      : 'Cart plan is invalid — items may be unavailable. Try the restaurant menu instead.',
                validation,
              },
            ]);
          } catch (err) {
            const msg =
              err instanceof AssistantApiError
                ? err.message
                : err instanceof Error
                  ? err.message
                  : 'Could not validate cart plan';
            setMessages((prev) => [
              ...prev,
              { id: nextId(), role: 'system', text: `Validation skipped: ${msg}` },
            ]);
          } finally {
            setValidating(false);
          }

          return reply;
        }

        if (usePersonalizationGuidancePath) {
          const guidance = buildPersonalizationGuidance({
            intent: personalizationIntent,
            bootstrap: personalizationBootstrap,
          });
          if (guidance) {
            setMessages((prev) => [
              ...prev,
              {
                id: nextId(),
                role: 'assistant',
                text: guidance.reply,
                ...(guidance.hints.length ? { hints: guidance.hints } : {}),
              },
              ...(guidance.systemNote
                ? [{ id: nextId(), role: 'system' as const, text: guidance.systemNote }]
                : []),
            ]);
            return guidance.reply;
          }
        }

        const usePostOrderPath =
          postOrderAssistEnabled &&
          (orderContext != null || isPostOrderUserMessage(message));

        if (usePostOrderPath) {
          const result = await askPostOrder({
            message,
            ...(conversationId ? { conversationId } : {}),
            ...(orderContext ? { orderContext } : {}),
          });
          setConversationId(result.conversationId);

          const triage = buildPostOrderTriageGuidance({ message, orderContext });
          const triageHints: ConsumerAssistHint[] = (triage?.escalationHints ?? []).map((h) => ({
            type: h.type,
            target: h.target,
          }));
          const hints = mergeAssistHints(
            result.suggestedHints.filter((h) => h.type !== 'none'),
            triageHints,
          );

          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: 'assistant',
              text: result.reply,
              ...(hints.length ? { hints } : {}),
            },
            ...(triage
              ? [
                  {
                    id: nextId(),
                    role: 'system' as const,
                    text: triage.systemNote,
                  },
                ]
              : []),
          ]);

          // Post-order path never proposes cart plans — no validate/apply here.
          return result.reply;
        }

        const result = await ask({
          message,
          ...(conversationId ? { conversationId } : {}),
        });
        setConversationId(result.conversationId);

        const hints = result.suggestedHints.filter((h) => h.type !== 'none');
        const cartActions = result.proposedCartActions;
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: 'assistant',
            text: result.reply,
            ...(hints.length ? { hints } : {}),
            ...(cartActions.length ? { cartActions } : {}),
          },
        ]);

        // Auto-validate plans when restaurant context is available — still no cart mutation.
        if (cartActions.length > 0 && restaurantId) {
          setValidating(true);
          try {
            const validation = await validate({
              restaurantId,
              proposedActions: cartActions,
              conversationId: result.conversationId,
            });
            setPendingValidation(validation);
            setMessages((prev) => [
              ...prev,
              {
                id: nextId(),
                role: 'system',
                text:
                  validation.status === 'validated'
                    ? 'Cart plan validated. Review and confirm to apply.'
                    : validation.status === 'needs_clarification'
                      ? 'Cart plan needs clarification before it can be applied.'
                      : 'Cart plan is invalid and cannot be applied.',
                validation,
              },
            ]);
          } catch (err) {
            const msg =
              err instanceof AssistantApiError
                ? err.message
                : err instanceof Error
                  ? err.message
                  : 'Could not validate cart plan';
            setMessages((prev) => [
              ...prev,
              { id: nextId(), role: 'system', text: `Validation skipped: ${msg}` },
            ]);
          } finally {
            setValidating(false);
          }
        } else if (cartActions.length > 0 && !restaurantId) {
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: 'system',
              text: 'Open a restaurant menu to validate this cart plan.',
              cartActions,
            },
          ]);
        }

        return result.reply;
      } catch (err) {
        if (err instanceof AssistantApiError) {
          setError(err.message);
        } else {
          setError(err instanceof Error ? err.message : 'Assistant request failed');
        }
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [
      ask,
      askPostOrder,
      conversationId,
      loading,
      orderContext,
      personalizationBootstrap,
      personalizationEnabled,
      postOrderAssistEnabled,
      restaurantId,
      validate,
    ],
  );

  const cancelVoice = useCallback(() => {
    voiceAbortRef.current?.abort();
  }, []);

  /**
   * Click-to-speak: capture one utterance, then reuse send() → validate → confirm.
   * Never auto-applies cart plans or places orders.
   */
  const sendFromVoice = useCallback(async () => {
    if (!voiceEnabled || loading || listening || validating || applying) return;

    if (!isVoiceCaptureAvailable()) {
      setError('Speech recognition is not available on this device/browser.');
      return;
    }

    const ac = new AbortController();
    voiceAbortRef.current = ac;
    setListening(true);
    setError(null);

    try {
      const { transcript } = await captureVoiceTranscript({
        signal: ac.signal,
        platform: 'web',
      });
      const reply = await send(transcript);

      // Optional spoken reply only — never speaks confirm/checkout prompts as actions.
      if (ttsEnabled && reply?.trim()) {
        try {
          await speakVoiceConfirmation({ text: reply, signal: ac.signal });
        } catch (ttsErr) {
          if (
            ttsErr instanceof AssistantApiError &&
            (ttsErr.code === 'AI_TTS_ABORTED' || ttsErr.code === 'AI_VOICE_ABORTED')
          ) {
            return;
          }
          // Non-fatal: keep the typed reply in the thread.
        }
      }
    } catch (err) {
      if (err instanceof AssistantApiError) {
        if (err.code === 'AI_VOICE_ABORTED') return;
        setError(err.message);
        return;
      }
      setError(err instanceof Error ? err.message : 'Voice capture failed');
    } finally {
      setListening(false);
      voiceAbortRef.current = null;
    }
  }, [applying, listening, loading, send, ttsEnabled, validating, voiceEnabled]);

  const followHint = useCallback(
    (hint: ConsumerAssistHint) => {
      if (hint.type === 'none') return;
      const target = hint.target?.trim();
      if (!target) return;

      // Human escalation / external links — user tap only.
      if (/^(mailto:|tel:)/i.test(target)) {
        void openExternalUrl(target);
        setOpen(false);
        return;
      }
      if (hint.type === 'open_url' && /^https?:\/\//i.test(target)) {
        window.open(target, '_blank', 'noopener,noreferrer');
        return;
      }
      if (target.startsWith('/')) {
        navigate(target);
        setOpen(false);
      }
    },
    [navigate],
  );

  const confirmApplyPlan = useCallback(async () => {
    if (!pendingValidation || applying) return;
    if (pendingValidation.status !== 'validated' || !pendingValidation.valid) {
      notifyToast('Only validated cart plans can be applied.', 'warning');
      return;
    }

    setApplying(true);
    try {
      const planRestaurant = pendingPlanRestaurantRef.current;
      if (planRestaurant) {
        const coords = resolveRestaurantCoords(activeLocation) ?? { lat: 0, lng: 0 };
        await ensureRestaurantContextForCartPlan({
          restaurantId: planRestaurant.restaurantId,
          restaurantSlug: planRestaurant.restaurantSlug,
          coords,
        });
      }

      const result = applyConfirmedCartPlan({
        userConfirmed: true,
        validation: pendingValidation,
        deps: { addItem, setQuantity },
      });

      reportCartPlanDecisionQuietly({
        decision: 'confirm',
        conversationId: pendingValidation.conversationId,
        planCount: pendingValidation.proposedActions.length,
      });

      if (result.appliedCount > 0) {
        notifyToast(
          result.skipped.length
            ? `Applied ${result.appliedCount} item(s); ${result.skipped.length} skipped.`
            : `Applied ${result.appliedCount} item(s) to cart.`,
          'success',
        );
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: 'system',
            text: `Applied ${result.appliedCount} cart change(s) after your confirmation.`,
          },
        ]);
        setPendingValidation(null);
        pendingPlanRestaurantRef.current = null;
      } else {
        notifyToast(
          result.skipped[0]?.reason || 'Could not apply cart plan — item details incomplete.',
          'warning',
        );
      }
    } catch (err) {
      notifyToast(
        err instanceof Error ? err.message : 'Could not prepare restaurant context for cart apply.',
        'warning',
      );
    } finally {
      setApplying(false);
    }
  }, [activeLocation, addItem, applying, pendingValidation, setQuantity]);

  const dismissPlan = useCallback(() => {
    const conversationId = pendingValidation?.conversationId;
    const planCount = pendingValidation?.proposedActions.length;
    setPendingValidation(null);
    pendingPlanRestaurantRef.current = null;
    reportCartPlanDecisionQuietly({
      decision: 'discard',
      conversationId,
      planCount,
    });
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: 'system', text: 'Cart plan discarded — nothing was added to cart.' },
    ]);
  }, [pendingValidation]);

  const setOpenSafe = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      setOpen((prev) => {
        const next = typeof value === 'function' ? value(prev) : value;
        if (!next) {
          voiceAbortRef.current?.abort();
        }
        return next;
      });
    },
    [],
  );

  return {
    open,
    setOpen: setOpenSafe,
    messages,
    loading,
    validating,
    applying,
    listening,
    error,
    pendingValidation,
    voiceEnabled,
    voiceAvailable,
    postOrderEnabled: postOrderFlag,
    postOrderMode,
    personalizationEnabled,
    send,
    sendFromVoice,
    cancelVoice,
    followHint,
    confirmApplyPlan,
    dismissPlan,
    clearError: () => setError(null),
  };
}
