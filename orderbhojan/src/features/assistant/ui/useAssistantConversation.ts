import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { applyConfirmedCartPlan } from '@/features/cart/domain/applyConfirmedCartPlan';
import { useCartStore } from '@/features/cart/store/cartStore';
import {
  canUseVoiceCoreCartAdd,
  canUseVoiceCoreConfirmApply,
  clearVoiceConfirmation,
  createOrderBhojanVoiceAdapter,
  createVoiceSession,
  idleOrderingTask,
  initialConfirmationSnapshot,
  recordVoiceCoreDualRun,
  runVoiceCoreTurn,
  shouldHandleWithVoiceCorePreLlm,
  syncConfirmationFromPending,
  type OrderBhojanVoiceAdapter,
} from '@/features/voice';
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
import { buildOrderingAssistContext } from '../domain/buildOrderingAssistContext';
import { parseCartAddUserMessage } from '../domain/isCartAddUserMessage';
import { decideVoiceCartTurn } from '../domain/decideVoiceCartTurn';
import {
  isStopVoiceAgentMessage,
} from '../domain/isConfirmCartUserMessage';
import { isPostOrderUserMessage } from '../domain/isPostOrderUserMessage';
import {
  correctTranscriptAgainstOrderingVocab,
  enrichCartPlansFromMenuCache,
  matchKitchenFragmentInMessage,
} from '../domain/matchOrderingVocabulary';
import { resolveCartPlanRestaurantId } from '../domain/resolveCartPlanRestaurant';
import { toPendingPlanRestaurantRef } from '../domain/restaurantIdSlug';
import { recordVoiceTelemetry } from '../domain/voiceOrderingTelemetry';
import { prefetchKitchenMenuForAssist } from '../application/prefetchKitchenMenuForAssist';
import {
  formatCartPlanSummarySpeech,
  summarizePendingCartPlan,
} from '../domain/summarizePendingCartPlan';
import { useAiPostOrderFeature } from '../hooks/useAiPostOrderFeature';
import { useAiVoiceCoreConfirmAddFeature } from '../hooks/useAiVoiceCoreConfirmAddFeature';
import { useAiVoiceFeature } from '../hooks/useAiVoiceFeature';
import { useAssistantPersonalizationContext } from '../hooks/useAssistantPersonalizationContext';
import { useAssistantPostOrderContext } from '../hooks/useAssistantPostOrderContext';
import { getAssistantApiClient } from '../infrastructure/assistantApiClient';
import { AssistantApiError, type ConsumerAssistHint } from '../types';
import { useAssistantApi } from '../hooks/useAssistantApi';
import { useVoiceStt } from '../hooks/useVoiceStt';
import { useVoiceTts } from '../hooks/useVoiceTts';
import { unlockAudioContext } from '../infrastructure/voiceSpeechSynthesis';

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

function validationSpeakText(
  validation: CartPlanValidationResult,
  kitchenName?: string | null,
): string {
  const summary = formatCartPlanSummarySpeech(
    summarizePendingCartPlan(validation, { kitchenName }),
  );
  if (validation.status === 'validated' && validation.valid) {
    return summary
      ? `Ready: ${summary}. Say confirm to add to cart, or discard to cancel.`
      : 'Plan looks good. Say confirm to add it to your cart, or discard to cancel.';
  }
  const clarify =
    validation.clarificationQuestions[0] ||
    validation.issues[0]?.message ||
    'I could not validate that dish on this kitchen’s menu. Try the exact menu name.';
  return summary ? `${clarify} (Working on: ${summary})` : clarify;
}

function toNearbyKitchenHints(
  kitchens: readonly { readonly id?: string; readonly name: string }[] | undefined,
): { id: string; name: string }[] {
  if (!kitchens?.length) return [];
  return kitchens
    .filter((k): k is { id: string; name: string } => Boolean(k.id?.trim() && k.name.trim()))
    .map((k) => ({ id: k.id.trim(), name: k.name.trim() }));
}

export function useAssistantConversation() {
  const { ask, askPostOrder, postOrderAssistEnabled, validate, loading, setLoading, validating, setValidating, error, setError } = useAssistantApi();
  const { listening, setListening, startListening, cancelListening, voiceCaptureAvailable, voiceAbortRef } = useVoiceStt();
  const { speaking, setSpeaking, voiceLanguage, setVoiceLanguage, speakReply } = useVoiceTts();

  const postOrderFlag = useAiPostOrderFeature();
  const orderContext = useAssistantPostOrderContext();
  const { enabled: personalizationEnabled, bootstrap: personalizationBootstrap } =
    useAssistantPersonalizationContext();
  const voiceEnabled = useAiVoiceFeature();
  const voiceCoreConfirmAddLive = useAiVoiceCoreConfirmAddFeature();
  const navigate = useNavigate();
  const restaurantId = useRestaurantContextStore((s) => s.restaurantId);
  const restaurantSlug = useRestaurantContextStore((s) => s.restaurantSlug);
  const addItem = useCartStore((s) => s.addItem);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const activeLocation = useActiveLocation();

  const postOrderMode = postOrderFlag && (Boolean(orderContext?.orderId) || Boolean(orderContext?.snapshot));

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<readonly AssistantThreadMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [applying, setApplying] = useState(false);
  const [voiceAgentActive, setVoiceAgentActive] = useState(false);
  const [pendingValidation, setPendingValidation] = useState<CartPlanValidationResult | null>(null);
  
  const voiceAgentActiveRef = useRef(false);
  const pendingValidationRef = useRef<CartPlanValidationResult | null>(null);
  const pendingPlanRestaurantRef = useRef<{
    restaurantId: string;
    restaurantSlug: string;
  } | null>(null);
  /** When assistant offers to open a kitchen, “yes” navigates instead of resetting chat. */
  const pendingExploreKitchenRef = useRef<{
    name: string;
    id?: string;
    searchPath: string;
  } | null>(null);
  const voiceSessionRef = useRef(
    createVoiceSession({ product: 'orderbhojan', channel: 'web' }),
  );
  const voiceConfirmationRef = useRef(initialConfirmationSnapshot());
  const voiceAdapterRef = useRef<OrderBhojanVoiceAdapter | null>(null);

  pendingValidationRef.current = pendingValidation;

  const syncPendingValidation = useCallback((next: CartPlanValidationResult | null) => {
    setPendingValidation(next);
    voiceConfirmationRef.current = next
      ? syncConfirmationFromPending(next)
      : clearVoiceConfirmation();
  }, []);

  const createLiveVoiceAdapter = useCallback((): OrderBhojanVoiceAdapter => {
    if (!voiceCoreConfirmAddLive) {
      const stub = createOrderBhojanVoiceAdapter({
        cartMutators: { addItem, setQuantity },
      });
      voiceAdapterRef.current = stub;
      return stub;
    }
    const adapter = createOrderBhojanVoiceAdapter({
      cartMutators: { addItem, setQuantity },
      enrichedValidate: {
        validate: async (request) =>
          validate({
            restaurantId: request.restaurantId,
            proposedActions: [...request.proposedActions],
            ...(request.conversationId
              ? { conversationId: request.conversationId }
              : conversationId
                ? { conversationId }
                : {}),
          }),
        getActiveRestaurant: () => ({
          restaurantId: restaurantId ?? null,
          restaurantSlug: restaurantSlug ?? null,
        }),
        getCoords: () => {
          const c = activeLocation?.coordinates;
          return c ? { lat: c.lat, lng: c.lng } : null;
        },
        getNearbyKitchens: () =>
          toNearbyKitchenHints(
            buildOrderingAssistContext({
              restaurantId,
              restaurantSlug,
              areaLabel: activeLocation?.displayLabel,
              lat: activeLocation?.coordinates?.lat,
              lng: activeLocation?.coordinates?.lng,
            })?.nearbyKitchens,
          ),
        ...(conversationId ? { conversationId } : {}),
      },
      ensureRestaurantContext: async (restaurant) => {
        const coords = resolveRestaurantCoords(activeLocation) ?? { lat: 0, lng: 0 };
        await ensureRestaurantContextForCartPlan({
          restaurantId: restaurant.restaurantId,
          restaurantSlug: restaurant.restaurantSlug,
          coords,
        });
      },
    });
    voiceAdapterRef.current = adapter;
    return adapter;
  }, [
    activeLocation,
    addItem,
    conversationId,
    restaurantId,
    restaurantSlug,
    setQuantity,
    validate,
    voiceCoreConfirmAddLive,
  ]);

  const send = useCallback(
    async (raw: string): Promise<string | undefined> => {
      const message = raw.trim();
      if (!message || loading) return undefined;

      const pending = pendingValidationRef.current;
      const earlyRoute = decideVoiceCartTurn({
        message,
        pending,
        kitchenNameHint: pendingPlanRestaurantRef.current?.restaurantSlug,
      });

      // “Confirm” while clarifying — keep task; do not wipe or fall into generic chat.
      if (earlyRoute.kind === 'confirm_while_clarifying') {
        setError(null);
        setMessages((prev) => [...prev, { id: nextId(), role: 'user', text: message }]);
        recordVoiceTelemetry('invalidConfirmAttempts');
        recordVoiceTelemetry('clarificationLoopCount');
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: 'assistant', text: earlyRoute.reply },
        ]);
        return earlyRoute.reply;
      }

      // Voice/text confirm — only when plan is already validated (not bare “yes” on clarify).
      if (earlyRoute.kind === 'apply_validated_confirm' && pending) {
        setError(null);
        setMessages((prev) => [...prev, { id: nextId(), role: 'user', text: message }]);
        setApplying(true);
        try {
          // Phase 1.3b: voice-core executor only when flag + readiness + parity pass.
          // Otherwise fall through to OB ensureRestaurantContext + applyConfirmedCartPlan.
          const liveAdapter = createLiveVoiceAdapter();
          const planRestaurant = pendingPlanRestaurantRef.current;
          if (planRestaurant) {
            liveAdapter.hydratePendingFromValidation(pending, planRestaurant);
          }
          const parity = canUseVoiceCoreConfirmApply({
            liveFlagEnabled: voiceCoreConfirmAddLive,
            adapterReady: liveAdapter.isConfirmAddReady(),
            earlyRouteKind: earlyRoute.kind,
            pending,
            adapterPending: liveAdapter.getPendingPlan(),
          });
          const dualRunSession = voiceSessionRef.current.sessionId;
          if (!parity.ok) {
            recordVoiceCoreDualRun({
              path: 'confirm',
              outcome:
                parity.reason === 'parity_conversation_mismatch'
                  ? 'parity_mismatch'
                  : 'parity_blocked',
              reason: parity.reason,
              sessionId: dualRunSession,
            });
          }
          if (parity.ok && liveAdapter.getPendingPlanId()) {
            recordVoiceCoreDualRun({
              path: 'confirm',
              outcome: 'attempt',
              sessionId: dualRunSession,
            });
            const voiceResult = await liveAdapter.confirmPendingChange(
              liveAdapter.getPendingPlanId()!,
            );
            if (voiceResult.ok) {
              recordVoiceCoreDualRun({
                path: 'confirm',
                outcome: 'voice_core_success',
                sessionId: dualRunSession,
              });
              reportCartPlanDecisionQuietly({
                decision: 'confirm',
                conversationId: pending.conversationId,
                planCount: pending.proposedActions.length,
              });
              const reply =
                'Added item(s) to your cart. Say checkout when ready, or ask for another dish.';
              setMessages((prev) => [
                ...prev,
                {
                  id: nextId(),
                  role: 'system',
                  text: 'Applied cart change(s) after your confirmation (voice-core).',
                },
                { id: nextId(), role: 'assistant', text: reply },
              ]);
              syncPendingValidation(null);
              pendingPlanRestaurantRef.current = null;
              pendingExploreKitchenRef.current = null;
              recordVoiceTelemetry('confirmApplySuccess');
              notifyToast('Applied item(s) to cart.', 'success');
              return reply;
            }
            // Voice-core did not mutate — fall back to OB executor (instant rollback path).
            recordVoiceTelemetry('confirmApplyFail');
            recordVoiceCoreDualRun({
              path: 'confirm',
              outcome: 'fallback_ob',
              reason: voiceResult.ok === false ? voiceResult.code : 'voice_core_confirm_failed',
              sessionId: dualRunSession,
            });
          }

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
            validation: pending,
            deps: { addItem, setQuantity },
          });
          reportCartPlanDecisionQuietly({
            decision: 'confirm',
            conversationId: pending.conversationId,
            planCount: pending.proposedActions.length,
          });
          if (result.appliedCount > 0) {
            const reply = `Added ${result.appliedCount} item${result.appliedCount === 1 ? '' : 's'} to your cart. Say checkout when ready, or ask for another dish.`;
            setMessages((prev) => [
              ...prev,
              {
                id: nextId(),
                role: 'system',
                text: `Applied ${result.appliedCount} cart change(s) after your confirmation.`,
              },
              { id: nextId(), role: 'assistant', text: reply },
            ]);
            syncPendingValidation(null);
            pendingPlanRestaurantRef.current = null;
            pendingExploreKitchenRef.current = null;
            recordVoiceTelemetry('confirmApplySuccess');
            notifyToast(`Applied ${result.appliedCount} item(s) to cart.`, 'success');
            return reply;
          }
          const fail =
            result.skipped[0]?.reason || 'Could not apply cart plan — try the menu ADD button.';
          recordVoiceTelemetry('confirmApplyFail');
          setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', text: fail }]);
          notifyToast(fail, 'warning');
          return fail;
        } catch (err) {
          recordVoiceTelemetry('confirmApplyFail');
          recordVoiceTelemetry('restaurantResolutionFailures');
          const fail =
            err instanceof Error ? err.message : 'Could not apply cart plan right now.';
          setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', text: fail }]);
          return fail;
        } finally {
          setApplying(false);
        }
      }

      if (earlyRoute.kind === 'discard' && pending) {
        setError(null);
        setMessages((prev) => [...prev, { id: nextId(), role: 'user', text: message }]);
        reportCartPlanDecisionQuietly({
          decision: 'discard',
          conversationId: pending.conversationId,
          planCount: pending.proposedActions.length,
        });
        syncPendingValidation(null);
        pendingPlanRestaurantRef.current = null;
        pendingExploreKitchenRef.current = null;
        const reply = 'Discarded — nothing was added. What would you like instead?';
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: 'system', text: 'Cart plan discarded — nothing was added to cart.' },
          { id: nextId(), role: 'assistant', text: reply },
        ]);
        return reply;
      }

      // Clarification reply: user names the dish after “which menu item…”
      if (earlyRoute.kind === 'clarify_dish' && pending) {
        const dishName = earlyRoute.dishName;
        const clarifyQty = earlyRoute.quantity;
        setError(null);
        setMessages((prev) => [...prev, { id: nextId(), role: 'user', text: message }]);
        setLoading(true);
        try {
          const planRestaurant = pendingPlanRestaurantRef.current;
          const nearbyForClarify = toNearbyKitchenHints(
            buildOrderingAssistContext({
              restaurantId: planRestaurant?.restaurantId ?? restaurantId,
              restaurantSlug: planRestaurant?.restaurantSlug ?? restaurantSlug,
              areaLabel: activeLocation?.displayLabel,
              lat: activeLocation?.coordinates?.lat,
              lng: activeLocation?.coordinates?.lng,
            })?.nearbyKitchens,
          );
          const draft: CartPlanAction = {
            type: 'cart_add_plan',
            requiresConfirmation: true,
            executable: false,
            payload: {
              name: dishName,
              quantity: clarifyQty,
              ...(planRestaurant?.restaurantId
                ? { restaurantId: planRestaurant.restaurantId }
                : restaurantId
                  ? { restaurantId }
                  : {}),
            },
            reason: 'user_clarification_item',
          };
          const cartActions = enrichCartPlansFromMenuCache([draft], {
            activeRestaurantId: planRestaurant?.restaurantId ?? restaurantId,
            userMessage: message,
            nearbyKitchens: nearbyForClarify,
          });
          const planRestaurantId = resolveCartPlanRestaurantId({
            plan: cartActions[0],
            userMessage: `${dishName}`,
            nearbyKitchens: nearbyForClarify,
            activeRestaurantId: planRestaurant?.restaurantId ?? restaurantId,
          });
          if (!planRestaurantId) {
            const reply = `I heard “${dishName}”. Open that kitchen’s menu or name the kitchen, then I’ll validate the cart plan.`;
            setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', text: reply }]);
            return reply;
          }
          pendingPlanRestaurantRef.current = toPendingPlanRestaurantRef({
            planRestaurantId,
            activeRestaurantId: restaurantId,
            activeRestaurantSlug: restaurantSlug,
          });
          await prefetchKitchenMenuForAssist({
            restaurantId: planRestaurantId,
            restaurantSlug: pendingPlanRestaurantRef.current.restaurantSlug,
            lat: activeLocation?.coordinates?.lat,
            lng: activeLocation?.coordinates?.lng,
          });
          setValidating(true);
          const validation = await validate({
            restaurantId: planRestaurantId,
            proposedActions: cartActions,
            ...(conversationId ? { conversationId } : {}),
          });
          syncPendingValidation(validation);
          if (validation.status === 'validated') recordVoiceTelemetry('planValidateSuccess');
          else recordVoiceTelemetry('planValidateFail');
          const reply = validationSpeakText(validation);
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: 'assistant',
              text: reply,
              cartActions,
              validation,
            },
          ]);
          return reply;
        } catch (err) {
          const msg =
            err instanceof AssistantApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Could not validate that item';
          setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', text: msg }]);
          return msg;
        } finally {
          setValidating(false);
          setLoading(false);
        }
      }

      // “Yes” after “explore kitchen X?” → open search/menu, don’t reset to Hello.
      const explore = pendingExploreKitchenRef.current;
      if (
        explore &&
        /^(yes|yeah|yep|yup|ok|okay|sure|haan|ha|open\s*it|show\s*(me\s*)?(it|them|menu)?)\b/i.test(
          message,
        )
      ) {
        setError(null);
        pendingExploreKitchenRef.current = null;
        setMessages((prev) => [...prev, { id: nextId(), role: 'user', text: message }]);
        navigate(explore.searchPath);
        const reply = `Opening ${explore.name}. Browse the live menu, then say “add” plus a dish name — Confirm is still required before cart changes.`;
        setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', text: reply }]);
        return reply;
      }

      setError(null);
      // Retain active ordering task unless user cancels or starts a new “add …” intent.
      if (earlyRoute.retainPending) {
        recordVoiceTelemetry('pendingRetained');
        // Keep pendingValidation / restaurant refs; continue into cart-add / assist paths.
      } else {
        recordVoiceTelemetry('pendingWiped');
        syncPendingValidation(null);
        pendingPlanRestaurantRef.current = null;
        pendingExploreKitchenRef.current = null;
      }
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
            syncPendingValidation(validation);
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

        const cartAddIntent = parseCartAddUserMessage(message);
        if (cartAddIntent) {
          // Phase 1.3b: enriched voice-core propose when flag + readiness pass; else OB path.
          const liveAddAdapter = createLiveVoiceAdapter();
          const addGate = canUseVoiceCoreCartAdd({
            liveFlagEnabled: voiceCoreConfirmAddLive,
            adapterReady: liveAddAdapter.isConfirmAddReady(),
          });
          const addSession = voiceSessionRef.current.sessionId;
          if (!addGate.ok) {
            recordVoiceCoreDualRun({
              path: 'add',
              outcome: 'parity_blocked',
              reason: addGate.reason,
              sessionId: addSession,
            });
          }
          if (addGate.ok) {
            recordVoiceCoreDualRun({
              path: 'add',
              outcome: 'attempt',
              sessionId: addSession,
            });
            const propose = await liveAddAdapter.proposeAddItemToCart({
              itemName: cartAddIntent.itemName,
              quantity: cartAddIntent.quantity,
              ...(cartAddIntent.kitchenHint
                ? { kitchenHint: cartAddIntent.kitchenHint }
                : {}),
            });
            const validation = liveAddAdapter.getPendingPlan();
            const restaurant = liveAddAdapter.getPendingRestaurant();
            if (propose.ok && validation && restaurant) {
              recordVoiceCoreDualRun({
                path: 'add',
                outcome: 'voice_core_success',
                sessionId: addSession,
              });
              pendingPlanRestaurantRef.current = restaurant;
              syncPendingValidation(validation);
              if (validation.status === 'validated') recordVoiceTelemetry('planValidateSuccess');
              else recordVoiceTelemetry('planValidateFail');
              const reply = propose.data.summarySpeech || validationSpeakText(validation);
              setMessages((prev) => [
                ...prev,
                {
                  id: nextId(),
                  role: 'assistant',
                  text: reply,
                  cartActions: validation.proposedActions,
                },
                {
                  id: nextId(),
                  role: 'system',
                  text:
                    validation.status === 'validated'
                      ? 'Cart plan validated. Review and confirm to apply.'
                      : reply,
                  validation,
                },
              ]);
              return reply;
            }
            // Propose failed — fall through to OB cart-add executor.
            recordVoiceCoreDualRun({
              path: 'add',
              outcome: 'fallback_ob',
              reason: propose.ok === false ? propose.code : 'missing_pending_restaurant',
              sessionId: addSession,
            });
          }

          const coordsForAdd = activeLocation?.coordinates;
          const nearbyForAdd = toNearbyKitchenHints(
            buildOrderingAssistContext({
              restaurantId,
              restaurantSlug,
              areaLabel: activeLocation?.displayLabel,
              lat: coordsForAdd?.lat,
              lng: coordsForAdd?.lng,
            })?.nearbyKitchens,
          );
          const kitchenHintMsg = cartAddIntent.kitchenHint
            ? `${cartAddIntent.itemName} from ${cartAddIntent.kitchenHint}`
            : message;
          const kitchenFromHint = cartAddIntent.kitchenHint
            ? matchKitchenFragmentInMessage(cartAddIntent.kitchenHint, nearbyForAdd)
            : null;
          const draftPlan: CartPlanAction = {
            type: 'cart_add_plan',
            requiresConfirmation: true,
            executable: false,
            payload: {
              name: cartAddIntent.itemName,
              quantity: cartAddIntent.quantity,
              ...(kitchenFromHint?.id
                ? { restaurantId: kitchenFromHint.id }
                : restaurantId
                  ? { restaurantId }
                  : {}),
            },
            reason: 'user_cart_add_intent',
          };
          const cartActions = enrichCartPlansFromMenuCache([draftPlan], {
            activeRestaurantId: kitchenFromHint?.id ?? restaurantId,
            userMessage: kitchenHintMsg,
            nearbyKitchens: nearbyForAdd,
          });
          const planRestaurantId = resolveCartPlanRestaurantId({
            plan: cartActions[0],
            userMessage: kitchenHintMsg,
            nearbyKitchens: nearbyForAdd,
            activeRestaurantId: kitchenFromHint?.id ?? restaurantId,
          });

          if (!planRestaurantId) {
            const q = cartAddIntent.kitchenHint || cartAddIntent.itemName;
            const searchPath = `/search?q=${encodeURIComponent(q)}`;
            pendingExploreKitchenRef.current = {
              name: cartAddIntent.kitchenHint || cartAddIntent.itemName,
              searchPath,
            };
            const reply = cartAddIntent.kitchenHint
              ? `I couldn’t load ${cartAddIntent.kitchenHint}’s menu yet. Say yes to open search for it, or open the kitchen and ask again.`
              : `To add ${cartAddIntent.quantity}× ${cartAddIntent.itemName}, open a kitchen menu first (or name the kitchen), then ask again — I’ll prepare a reviewable cart plan. Nothing is added until you confirm.`;
            const hints: ConsumerAssistHint[] = [
              { type: 'navigate', target: searchPath },
              { type: 'navigate', target: '/' },
            ];
            setMessages((prev) => [
              ...prev,
              { id: nextId(), role: 'assistant', text: reply, hints },
            ]);
            return reply;
          }

          const resolvedName =
            (typeof cartActions[0]?.payload?.name === 'string' && cartActions[0].payload.name) ||
            cartAddIntent.itemName;
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: 'assistant',
              text: `Checking ${cartAddIntent.quantity}× ${resolvedName} on the menu…`,
              cartActions,
            },
          ]);
          pendingPlanRestaurantRef.current = toPendingPlanRestaurantRef({
            planRestaurantId,
            activeRestaurantId: restaurantId,
            activeRestaurantSlug: restaurantSlug,
          });
          await prefetchKitchenMenuForAssist({
            restaurantId: planRestaurantId,
            restaurantSlug: pendingPlanRestaurantRef.current.restaurantSlug,
            lat: activeLocation?.coordinates?.lat,
            lng: activeLocation?.coordinates?.lng,
          });
          setValidating(true);
          try {
            const validation = await validate({
              restaurantId: planRestaurantId,
              proposedActions: cartActions,
              ...(conversationId ? { conversationId } : {}),
            });
            syncPendingValidation(validation);
            if (pendingPlanRestaurantRef.current) {
              createLiveVoiceAdapter().hydratePendingFromValidation(
                validation,
                pendingPlanRestaurantRef.current,
              );
            }
            if (validation.status === 'validated') recordVoiceTelemetry('planValidateSuccess');
            else recordVoiceTelemetry('planValidateFail');
            const reply = validationSpeakText(validation);
            setMessages((prev) => [
              ...prev,
              {
                id: nextId(),
                role: 'system',
                text:
                  validation.status === 'validated'
                    ? 'Cart plan validated. Review and confirm to apply.'
                    : reply,
                validation,
              },
            ]);
            return reply;
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
            return msg;
          } finally {
            setValidating(false);
          }
        }

        // Phase 1.2/1.3: voice-core pre-LLM gate (cart summary + stop only).
        // Live confirm/add executor is gated separately (FF_OB_AI_VOICE_CORE_CONFIRM_ADD).
        if (shouldHandleWithVoiceCorePreLlm(message)) {
          const adapter = createOrderBhojanVoiceAdapter({
            cartMutators: { addItem, setQuantity },
          });
          const session = createVoiceSession({
            product: 'orderbhojan',
            channel: 'web',
            conversationId: conversationId || voiceSessionRef.current.conversationId,
          });
          voiceSessionRef.current = session;
          const turn = await runVoiceCoreTurn({
            session,
            message,
            confirmation: voiceConfirmationRef.current,
            task: idleOrderingTask(pendingPlanRestaurantRef.current?.restaurantId),
            adapter,
          });
          voiceConfirmationRef.current = turn.confirmation;
          if (turn.kind === 'stop_agent' && turn.spoken) {
            if (voiceAgentActiveRef.current) {
              voiceAgentActiveRef.current = false;
              setVoiceAgentActive(false);
              cancelListening();
              setSpeaking(false);
            }
            setMessages((prev) => [
              ...prev,
              { id: nextId(), role: 'assistant', text: turn.spoken },
            ]);
            return turn.spoken;
          }
          if (turn.kind === 'cart_summary' && turn.spoken) {
            setMessages((prev) => [
              ...prev,
              { id: nextId(), role: 'assistant', text: turn.spoken },
            ]);
            return turn.spoken;
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

        const coords = activeLocation?.coordinates;
        const baseOrderingContext = buildOrderingAssistContext({
          restaurantId,
          restaurantSlug,
          areaLabel: activeLocation?.displayLabel,
          lat: coords?.lat,
          lng: coords?.lng,
        });
        const nearbyHints = toNearbyKitchenHints(baseOrderingContext?.nearbyKitchens);

        // Kitchen-name only (e.g. "Inti Bhojanam") → open kitchen; dish+kitchen goes to LLM+validate.
        const kitchenOnlyHit =
          nearbyHints.length > 0 ? matchKitchenFragmentInMessage(message, nearbyHints) : null;
        const looksLikeDishRequest =
          /\b(add|order|get|want|cart|dosa|idli|wada|vada|thali|biryani|meal|curry|rice)\b/i.test(
            message,
          );
        if (kitchenOnlyHit && !looksLikeDishRequest) {
          const searchPath = `/search?q=${encodeURIComponent(kitchenOnlyHit.name)}`;
          const reply = `I found kitchen “${kitchenOnlyHit.name}”. Open it to see today’s live menu, then ask me to add a dish (e.g. “add Idli”). Nothing is added until you confirm.`;
          const hints: ConsumerAssistHint[] = [
            { type: 'navigate', target: searchPath },
            { type: 'navigate', target: '/' },
          ];
          setMessages((prev) => [
            ...prev,
            { id: nextId(), role: 'assistant', text: reply, hints },
          ]);
          return reply;
        }

        // Ground LLM on the kitchen named in the utterance when we can resolve it.
        const namedKitchen =
          kitchenOnlyHit ??
          (nearbyHints.length
            ? (() => {
                const ranked = nearbyHints
                  .map((k) => ({
                    k,
                    hit: message.toLowerCase().replace(/\s/g, '').includes(
                      k.name.toLowerCase().replace(/\s/g, '').slice(0, 8),
                    ),
                  }))
                  .find((e) => e.hit);
                return ranked?.k ?? null;
              })()
            : null);
        const preferRestaurantId =
          namedKitchen && 'id' in namedKitchen && namedKitchen.id
            ? namedKitchen.id
            : resolveCartPlanRestaurantId({
                plan: null,
                userMessage: message,
                nearbyKitchens: nearbyHints,
                activeRestaurantId: restaurantId,
              });

        const orderingContext =
          buildOrderingAssistContext({
            restaurantId,
            restaurantSlug,
            restaurantName: namedKitchen?.name,
            areaLabel: activeLocation?.displayLabel,
            lat: coords?.lat,
            lng: coords?.lng,
            preferRestaurantId,
            nearbyKitchens: baseOrderingContext?.nearbyKitchens,
          }) ?? baseOrderingContext;

        const result = await ask({
          message,
          ...(conversationId ? { conversationId } : {}),
          ...(orderingContext ? { orderingContext } : {}),
        });
        setConversationId(result.conversationId);

        const hints = result.suggestedHints.filter((h) => h.type !== 'none');

        // Hydrate empty/broken LLM cart plans from the utterance (fixes MISSING_ITEM_REFERENCE).
        const parsedAdd = parseCartAddUserMessage(message);
        const hydratedPlans: CartPlanAction[] =
          result.proposedCartActions.length > 0
            ? result.proposedCartActions.map((plan) => {
                if (plan.type !== 'cart_add_plan' && plan.type !== 'cart_update_plan') return plan;
                const name =
                  (typeof plan.payload?.name === 'string' && plan.payload.name.trim()) ||
                  parsedAdd?.itemName ||
                  '';
                const qty =
                  typeof plan.payload?.quantity === 'number'
                    ? plan.payload.quantity
                    : (parsedAdd?.quantity ?? 1);
                return {
                  ...plan,
                  payload: {
                    ...(plan.payload ?? {}),
                    ...(name ? { name } : {}),
                    quantity: qty,
                  },
                };
              })
            : parsedAdd
              ? [
                  {
                    type: 'cart_add_plan' as const,
                    requiresConfirmation: true,
                    executable: false,
                    payload: {
                      name: parsedAdd.itemName,
                      quantity: parsedAdd.quantity,
                      ...(preferRestaurantId ? { restaurantId: preferRestaurantId } : {}),
                    },
                    reason: 'client_hydrated_from_utterance',
                  },
                ]
              : [];

        const cartActions = enrichCartPlansFromMenuCache(hydratedPlans, {
          activeRestaurantId: preferRestaurantId ?? restaurantId,
          userMessage: message,
          assistantMessage: result.reply,
          nearbyKitchens: nearbyHints,
        });
        const planRestaurantId = resolveCartPlanRestaurantId({
          plan: cartActions[0],
          userMessage: message,
          assistantMessage: result.reply,
          nearbyKitchens: nearbyHints,
          activeRestaurantId: preferRestaurantId ?? restaurantId,
        });

        // Offer “yes → open kitchen” when model suggests exploring without a cart plan.
        if (cartActions.length === 0) {
          const exploreHint = hints.find(
            (h) => h.type === 'navigate' && typeof h.target === 'string' && h.target.includes('/'),
          );
          const kitchenOffer =
            namedKitchen ||
            matchKitchenFragmentInMessage(result.reply, nearbyHints) ||
            matchKitchenFragmentInMessage(message, nearbyHints);
          if (
            kitchenOffer &&
            /explore|open|menu|would you like|shall i|nearby kitchen/i.test(result.reply)
          ) {
            const searchPath =
              exploreHint?.target?.startsWith('/')
                ? exploreHint.target
                : `/search?q=${encodeURIComponent(kitchenOffer.name)}`;
            pendingExploreKitchenRef.current = {
              name: kitchenOffer.name,
              ...(kitchenOffer.id ? { id: kitchenOffer.id } : {}),
              searchPath,
            };
          }
        }

        // Prefer validation-aware copy over optimistic “I found…” when validate fails.
        let displayReply = result.reply;
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: 'assistant',
            text: displayReply,
            ...(hints.length ? { hints } : {}),
            ...(cartActions.length ? { cartActions } : {}),
          },
        ]);

        if (cartActions.length > 0 && planRestaurantId) {
          pendingPlanRestaurantRef.current = toPendingPlanRestaurantRef({
            planRestaurantId,
            activeRestaurantId: restaurantId,
            activeRestaurantSlug: restaurantSlug,
          });
          await prefetchKitchenMenuForAssist({
            restaurantId: planRestaurantId,
            restaurantSlug: pendingPlanRestaurantRef.current.restaurantSlug,
            lat: coords?.lat,
            lng: coords?.lng,
          });
          setValidating(true);
          try {
            const validation = await validate({
              restaurantId: planRestaurantId,
              proposedActions: cartActions,
              conversationId: result.conversationId,
            });
            syncPendingValidation(validation);
            if (validation.status === 'validated') recordVoiceTelemetry('planValidateSuccess');
            else {
              recordVoiceTelemetry('planValidateFail');
              recordVoiceTelemetry('clarificationLoopCount');
            }
            const outcome = validationSpeakText(validation);
            if (validation.status !== 'validated') {
              displayReply = outcome;
              // Replace optimistic assistant bubble so UI does not contradict validate.
              // Keep details on the assistant line only — confirm panel shows status, not a 3× repeat.
              setMessages((prev) => {
                const next = [...prev];
                for (let i = next.length - 1; i >= 0; i -= 1) {
                  if (next[i]?.role === 'assistant') {
                    next[i] = {
                      ...next[i]!,
                      text: outcome,
                      cartActions,
                      validation,
                    };
                    break;
                  }
                }
                return next;
              });
            } else {
              setMessages((prev) => [
                ...prev,
                {
                  id: nextId(),
                  role: 'system',
                  text: 'Cart plan validated. Review and confirm to apply.',
                  validation,
                },
              ]);
            }
            return displayReply;
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
            return result.reply;
          } finally {
            setValidating(false);
          }
        }

        if (cartActions.length > 0 && !planRestaurantId) {
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: 'system',
              text: 'Name the kitchen or open its menu so I can validate this cart plan.',
              cartActions,
            },
          ]);
        }

        return displayReply;
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
      activeLocation,
      ask,
      addItem,
      askPostOrder,
      conversationId,
      loading,
      navigate,
      orderContext,
      personalizationBootstrap,
      personalizationEnabled,
      postOrderAssistEnabled,
      restaurantId,
      restaurantSlug,
      setQuantity,
      syncPendingValidation,
      createLiveVoiceAdapter,
      validate,
      voiceCoreConfirmAddLive,
    ],
  );

  const cancelVoice = useCallback(() => {
    cancelListening();
  }, [cancelListening]);

  const stopVoiceAgent = useCallback(() => {
    voiceAgentActiveRef.current = false;
    setVoiceAgentActive(false);
    cancelListening();
    setSpeaking(false);
  }, [cancelListening, setSpeaking]);

  /**
   * One listen → assist → speak turn. Used by tap-mic and the live voice-agent loop.
   * Never auto-applies cart plans (confirm is still required — spoken “confirm” works).
   */
  const runVoiceTurn = useCallback(
    async (options?: {
      readonly forceSpeak?: boolean;
      /** Live agent uses a longer listen window and quieter timeout handling. */
      readonly agentMode?: boolean;
    }): Promise<'ok' | 'stop' | 'abort' | 'error' | 'timeout'> => {
      if (!voiceEnabled) return 'error';

      // Barge-in: stop any in-flight TTS before opening the mic.
      cancelListening();
      const ac = new AbortController();
      setSpeaking(false);
      setError(null);
      const agentMode = options?.agentMode === true || voiceAgentActiveRef.current;

      try {
        const transcript = await startListening({
          lang: voiceLanguage,
          agentMode,
          ac
        });

        const coords = activeLocation?.coordinates;
        const orderingContext = buildOrderingAssistContext({
          restaurantId,
          restaurantSlug,
          areaLabel: activeLocation?.displayLabel,
          lat: coords?.lat,
          lng: coords?.lng,
        });
        const corrected = correctTranscriptAgainstOrderingVocab(transcript, orderingContext);

        if (isStopVoiceAgentMessage(corrected)) {
          const bye = 'Voice agent paused. Tap the AI orb anytime to continue.';
          setMessages((prev) => [
            ...prev,
            { id: nextId(), role: 'user', text: corrected },
            { id: nextId(), role: 'assistant', text: bye },
          ]);
          await speakReply(bye, ac.signal, true);
          return 'stop';
        }

        const reply = await send(corrected);
        await speakReply(reply, ac.signal, options?.forceSpeak === true || voiceAgentActiveRef.current);
        return 'ok';
      } catch (err) {
        if (err instanceof AssistantApiError) {
          if (err.code === 'AI_VOICE_ABORTED') return 'abort';
          // Soft-fail timeouts in live agent — re-listen without a scary red banner.
          if (err.code === 'AI_VOICE_TIMEOUT' || err.code === 'AI_VOICE_EMPTY') {
            if (agentMode) return 'timeout';
            setError(err.message);
            return 'timeout';
          }
          if (err.code === 'AI_VOICE_PERMISSION_DENIED') {
            setError(
              `${err.message} You can still type your order in chat.`,
            );
            return 'error';
          }
          if (err.code === 'AI_VOICE_UNSUPPORTED') {
            setError(err.message);
            return 'error';
          }
          setError(err.message);
          return 'error';
        }
        setError(err instanceof Error ? err.message : 'Voice capture failed');
        return 'error';
      }
    },
    [
      activeLocation?.coordinates,
      activeLocation?.displayLabel,
      restaurantId,
      restaurantSlug,
      send,
      speakReply,
      voiceEnabled,
      startListening,
      cancelListening,
      setSpeaking,
      setError,
      voiceLanguage,
    ],
  );

  /** Tap mic: single turn with spoken reply when TTS is on. */
  const sendFromVoice = useCallback(async () => {
    unlockAudioContext();
    if (!voiceEnabled || loading || listening || validating || applying || speaking) return;
    await runVoiceTurn({ forceSpeak: true }); // Always force speak on tap-mic for now or conditionally
  }, [applying, listening, loading, runVoiceTurn, speaking, validating, voiceEnabled]);

  /**
   * Live voice agent: listen → reply (spoken) → listen again until stop / error / close.
   * Cart still requires spoken or tapped Confirm — never blind checkout.
   */
  const startVoiceAgent = useCallback(async () => {
    unlockAudioContext();
    if (!voiceEnabled) {
      setError('Enable voice on this build to use the live Voice Agent.');
      return;
    }
    if (voiceAgentActiveRef.current) return;
    if (!voiceCaptureAvailable) {
      setError('Speech recognition is not available on this device/browser.');
      return;
    }

    voiceAgentActiveRef.current = true;
    setVoiceAgentActive(true);
    setOpen(true);
    setError(null);

    const greeting =
      'OrderBhojan Voice Agent ready. Tell me a kitchen or dish — say confirm to add a validated plan.';
    setMessages((prev) =>
      prev.length === 0
        ? [...prev, { id: nextId(), role: 'assistant', text: greeting }]
        : prev,
    );

    // Warm menu cache for active kitchen + nearby names before first listen.
    const coords = activeLocation?.coordinates;
    void prefetchKitchenMenuForAssist({
      restaurantId,
      restaurantSlug,
      lat: coords?.lat,
      lng: coords?.lng,
    });
    const nearby = toNearbyKitchenHints(
      buildOrderingAssistContext({
        restaurantId,
        restaurantSlug,
        areaLabel: activeLocation?.displayLabel,
        lat: coords?.lat,
        lng: coords?.lng,
      })?.nearbyKitchens,
    );
    for (const kitchen of nearby.slice(0, 4)) {
      void prefetchKitchenMenuForAssist({
        restaurantId: kitchen.id,
        restaurantName: kitchen.name,
        lat: coords?.lat,
        lng: coords?.lng,
      });
    }

    const greetAc = new AbortController();
    voiceAbortRef.current = greetAc;
    try {
      await speakReply(greeting, greetAc.signal, true);
    } catch {
      /* non-fatal */
    }
    // Let TTS fully release the mic before listening (WebView echo guard).
    await new Promise((r) => setTimeout(r, 400));

    while (voiceAgentActiveRef.current) {
      if (loading || validating || applying || speaking) {
        await new Promise((r) => setTimeout(r, 200));
        continue;
      }
      const outcome = await runVoiceTurn({ forceSpeak: true, agentMode: true });
      if (outcome === 'stop' || outcome === 'abort') {
        break;
      }
      if (outcome === 'timeout') {
        // Quiet re-listen — no red “Voice capture timed out” spam.
        await new Promise((r) => setTimeout(r, 350));
        if (!voiceAgentActiveRef.current) break;
        continue;
      }
      if (outcome === 'error') {
        await new Promise((r) => setTimeout(r, 600));
        if (!voiceAgentActiveRef.current) break;
        continue;
      }
      await new Promise((r) => setTimeout(r, 320));
    }

    voiceAgentActiveRef.current = false;
    setVoiceAgentActive(false);
    setListening(false);
    setSpeaking(false);
  }, [applying, loading, runVoiceTurn, speakReply, speaking, validating, voiceEnabled]);

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
        syncPendingValidation(null);
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
  }, [activeLocation, addItem, applying, pendingValidation, setQuantity, syncPendingValidation]);

  const dismissPlan = useCallback(() => {
    const conversationId = pendingValidation?.conversationId;
    const planCount = pendingValidation?.proposedActions.length;
    syncPendingValidation(null);
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
  }, [pendingValidation, syncPendingValidation]);

  const setOpenSafe = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      setOpen((prev) => {
        const next = typeof value === 'function' ? value(prev) : value;
        if (!next) {
          voiceAgentActiveRef.current = false;
          setVoiceAgentActive(false);
          voiceAbortRef.current?.abort();
          setListening(false);
          setSpeaking(false);
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
    speaking,
    voiceAgentActive,
    error,
    pendingValidation,
    voiceEnabled,
    voiceAvailable: voiceCaptureAvailable,
    postOrderEnabled: postOrderFlag,
    postOrderMode,
    personalizationEnabled,
    voiceLanguage,
    setVoiceLanguage,
    send,
    sendFromVoice,
    startVoiceAgent,
    stopVoiceAgent,
    cancelVoice,
    followHint,
    confirmApplyPlan,
    dismissPlan,
    clearError: () => setError(null),
  };
}
