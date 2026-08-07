import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { applyConfirmedCartPlan } from '@/features/cart/domain/applyConfirmedCartPlan';
import { useCartStore } from '@/features/cart/store/cartStore';
import {
  clearVoiceConfirmation,
  createOrderBhojanVoiceAdapter,
  createVoiceSession,
  idleOrderingTask,
  initialConfirmationSnapshot,
  pendingPlanIdFromValidation,
  runVoiceCoreTurn,
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
import { parseCartAddUserMessage, normalizeQuantityAsr, parseQuantityOnlyMessage } from '../domain/isCartAddUserMessage';
import { patchPendingPlanQuantity } from '../domain/patchPendingPlanQuantity';
import { buildOrderingAssistContext } from '../domain/buildOrderingAssistContext';
import {
  isStopVoiceAgentMessage,
} from '../domain/isConfirmCartUserMessage';
import { isPostOrderUserMessage } from '../domain/isPostOrderUserMessage';
import {
  correctTranscriptAgainstOrderingVocab,
  enrichCartPlansFromMenuCache,
  matchKitchenFragmentInMessage,
} from '../domain/matchOrderingVocabulary';
import { expandIndicOrderingUtterance } from '../domain/orderingTextNormalize';
import { groundVoiceOrderingContext } from '../domain/resolveKitchenForVoice';
import { resolveCartPlanRestaurantId } from '../domain/resolveCartPlanRestaurant';
import { toPendingPlanRestaurantRef } from '../domain/restaurantIdSlug';
import { recordVoiceTelemetry } from '../domain/voiceOrderingTelemetry';
import { prefetchKitchenMenuForAssist } from '../application/prefetchKitchenMenuForAssist';
import { useCheckoutScheduleStore } from '@/features/checkout/store/checkoutScheduleStore';
import {
  formatCartPlanSummarySpeech,
  summarizePendingCartPlan,
} from '../domain/summarizePendingCartPlan';
import { useAiPostOrderFeature } from '../hooks/useAiPostOrderFeature';

import { useAiVoiceFeature } from '../hooks/useAiVoiceFeature';
import { useAssistantPersonalizationContext } from '../hooks/useAssistantPersonalizationContext';
import { useAssistantPostOrderContext } from '../hooks/useAssistantPostOrderContext';
import { getAssistantApiClient } from '../infrastructure/assistantApiClient';
import { AssistantApiError, type ConsumerAssistHint } from '../types';
import { useAssistantApi } from '../hooks/useAssistantApi';
import { useVoiceStt } from '../hooks/useVoiceStt';
import { useVoiceTts } from '../hooks/useVoiceTts';
import { unlockAudioContext } from '../infrastructure/voiceSpeechSynthesis';
import { forceStopSpeechCapture } from '../infrastructure/voiceSpeechCapture';

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
  const voiceCoreConfirmAddLive = true;
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
  /** Explicit UX gate so Thinking/Speaking show before loading/TTS flags flip. */
  const [voiceTurnPhase, setVoiceTurnPhase] = useState<
    'idle' | 'listening' | 'thinking' | 'speaking'
  >('idle');
  const [pendingValidation, setPendingValidation] = useState<CartPlanValidationResult | null>(null);
  
  const voiceAgentActiveRef = useRef(false);
  const voiceTurnPhaseRef = useRef(voiceTurnPhase);
  voiceTurnPhaseRef.current = voiceTurnPhase;
  /** After a successful voice cart apply, pause live listen so customers are not left “recording”. */
  const pauseLiveVoiceAfterTurnRef = useRef(false);
  /** Sheet visibility — mic must never stay open when this is false. */
  const sheetOpenRef = useRef(false);
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
      const message = normalizeQuantityAsr(raw.trim());
      if (!message || loading) return undefined;

      
      const liveAdapter = createLiveVoiceAdapter();
      const planRestaurant = pendingPlanRestaurantRef.current;
      const pending = pendingValidationRef.current;

      // Quantity-only ASR (“to quantity” → 2) while a plan is pending — skip LLM loop.
      const quantityOnly = parseQuantityOnlyMessage(message);
      if (quantityOnly != null && pending?.proposedActions?.length) {
        const patched = patchPendingPlanQuantity(pending, quantityOnly);
        syncPendingValidation(patched);
        voiceConfirmationRef.current = syncConfirmationFromPending(patched);
        liveAdapter.hydratePendingFromValidation(
          patched,
          planRestaurant,
          pendingPlanIdFromValidation(patched),
        );
        const dish =
          typeof patched.proposedActions[0]?.payload?.name === 'string'
            ? patched.proposedActions[0].payload.name
            : 'your item';
        const reply = `Got it — ${quantityOnly}× ${dish}. Say confirm to add to cart.`;
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: 'user', text: message },
          {
            id: nextId(),
            role: 'assistant',
            text: reply,
            cartActions: patched.proposedActions,
            validation: patched,
          },
        ]);
        return reply;
      }

      // Keep confirmation FSM aligned with the UI pending plan every turn.
      if (pending) {
        voiceConfirmationRef.current = syncConfirmationFromPending(pending);
        liveAdapter.hydratePendingFromValidation(
          pending,
          planRestaurant,
          pendingPlanIdFromValidation(pending),
        );
      }
      
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
        task: idleOrderingTask(planRestaurant?.restaurantId),
        adapter: liveAdapter,
      });
      
      voiceConfirmationRef.current = turn.confirmation;
      
      if (turn.kind !== 'continue_llm') {
        const validation = liveAdapter.getPendingPlan();
        syncPendingValidation(validation || null);
        if (validation) {
          const res = liveAdapter.getPendingRestaurant();
          pendingPlanRestaurantRef.current = res ? { restaurantId: res.restaurantId, restaurantSlug: res.restaurantSlug } : null;
        } else {
          pendingPlanRestaurantRef.current = null;
        }

        if (turn.kind === 'stop_agent' && turn.spoken) {
          if (voiceAgentActiveRef.current) {
            voiceAgentActiveRef.current = false;
            setVoiceAgentActive(false);
            cancelListening();
            setSpeaking(false);
          }
        }
        
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: 'user', text: message },
          { 
            id: nextId(), 
            role: 'assistant', 
            text: turn.spoken, 
            ...(validation?.proposedActions ? { cartActions: validation.proposedActions } : {}),
            ...(validation ? { validation } : {})
          },
        ]);
        
        if (turn.kind === 'apply_confirmed_change') {
          notifyToast('Applied item(s) to cart.', 'success');
          // Pause live agent after this turn’s spoken reply — stops STT beeps / “still recording” feel.
          if (turn.applied !== false) {
            pauseLiveVoiceAfterTurnRef.current = true;
          }
        }
        
        return turn.spoken;
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
const usePostOrderPath =
          postOrderAssistEnabled &&
          (orderContext != null || isPostOrderUserMessage(message));

        if (usePostOrderPath) {
          const result = await askPostOrder({
            message,
            preferredLanguage: voiceLanguage,
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

        // Menu Agent: resolve real kitchen slug via marketplace search + prefetch live menu
        // BEFORE assist/validate. Never invent slugs from display names (causes “Not Found”).
        const grounded = await groundVoiceOrderingContext({
          message,
          lat: coords?.lat,
          lng: coords?.lng,
          areaLabel: activeLocation?.displayLabel,
          activeRestaurantId: restaurantId,
          activeRestaurantSlug: restaurantSlug,
          nearbyKitchens: nearbyHints,
        });
        const groundedMessage = grounded.expandedMessage || expandIndicOrderingUtterance(message);
        const groundedNearby = toNearbyKitchenHints(
          grounded.orderingContext?.nearbyKitchens ??
            (grounded.kitchen
              ? [{ id: grounded.kitchen.restaurantId, name: grounded.kitchen.displayName }]
              : nearbyHints),
        );

        // Kitchen-name only (e.g. "Inti Bhojanam") → open kitchen; dish+kitchen goes to LLM+validate.
        const kitchenOnlyHit =
          groundedNearby.length > 0
            ? matchKitchenFragmentInMessage(groundedMessage, groundedNearby)
            : grounded.kitchen
              ? { id: grounded.kitchen.restaurantId, name: grounded.kitchen.displayName }
              : null;
        const looksLikeDishRequest =
          /\b(add|order|get|want|cart|dosa|idli|wada|vada|thali|biryani|meal|curry|rice|rendu|masala|దోశ|దోస|మసాలా|ఇడ్లీ)\b/iu.test(
            groundedMessage,
          ) || grounded.menuItemCount > 0;
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

        const preferRestaurantId =
          grounded.kitchen?.restaurantId ||
          (kitchenOnlyHit && 'id' in kitchenOnlyHit && kitchenOnlyHit.id
            ? kitchenOnlyHit.id
            : resolveCartPlanRestaurantId({
                plan: null,
                userMessage: groundedMessage,
                nearbyKitchens: groundedNearby,
                activeRestaurantId: restaurantId,
              }));

        const orderingContext =
          grounded.orderingContext ??
          buildOrderingAssistContext({
            restaurantId,
            restaurantSlug,
            restaurantName: grounded.kitchen?.displayName ?? kitchenOnlyHit?.name,
            areaLabel: activeLocation?.displayLabel,
            lat: coords?.lat,
            lng: coords?.lng,
            preferRestaurantId,
            nearbyKitchens: groundedNearby,
          }) ??
          baseOrderingContext;

        const result = await ask({
          message: groundedMessage,
          preferredLanguage: voiceLanguage,
          ...(conversationId ? { conversationId } : {}),
          ...(orderingContext ? { orderingContext } : {}),
        });
        setConversationId(result.conversationId);

        // Voice schedule metadata → checkout deliveryTimeSlot (no payment mutation).
        // Clarify/error wins: do not apply a preference when the waiter asks for a clearer time.
        const scheduleFeedback = result.scheduleVoiceFeedback;
        if (scheduleFeedback) {
          useCheckoutScheduleStore.getState().setNotice({
            kind: scheduleFeedback.kind,
            message: scheduleFeedback.message || result.reply,
            reason: scheduleFeedback.reason,
          });
        } else {
          const schedulePref = result.proposedScheduleActions?.[0];
          if (schedulePref) {
            useCheckoutScheduleStore.getState().setFromVoice(schedulePref);
          }
        }

        const hints = result.suggestedHints.filter((h) => h.type !== 'none');

        // Hydrate empty/broken LLM cart plans from the utterance (fixes MISSING_ITEM_REFERENCE).
        const parsedAdd = parseCartAddUserMessage(groundedMessage);
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
                    ...(preferRestaurantId ? { restaurantId: preferRestaurantId } : {}),
                    ...(grounded.kitchen?.restaurantSlug
                      ? { restaurantSlug: grounded.kitchen.restaurantSlug }
                      : {}),
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
                      ...(grounded.kitchen?.restaurantSlug
                        ? { restaurantSlug: grounded.kitchen.restaurantSlug }
                        : {}),
                    },
                    reason: 'client_hydrated_from_utterance',
                  },
                ]
              : [];

        const cartActions = enrichCartPlansFromMenuCache(hydratedPlans, {
          activeRestaurantId: preferRestaurantId ?? restaurantId,
          userMessage: groundedMessage,
          assistantMessage: result.reply,
          nearbyKitchens: groundedNearby,
        });
        const planRestaurantId = resolveCartPlanRestaurantId({
          plan: cartActions[0],
          userMessage: groundedMessage,
          assistantMessage: result.reply,
          nearbyKitchens: groundedNearby,
          activeRestaurantId: preferRestaurantId ?? restaurantId,
        });

        // Offer “yes → open kitchen” when model suggests exploring without a cart plan.
        if (cartActions.length === 0) {
          const exploreHint = hints.find(
            (h) => h.type === 'navigate' && typeof h.target === 'string' && h.target.includes('/'),
          );
          const kitchenOffer =
            grounded.kitchen
              ? { id: grounded.kitchen.restaurantId, name: grounded.kitchen.displayName }
              : kitchenOnlyHit ||
                matchKitchenFragmentInMessage(result.reply, groundedNearby) ||
                matchKitchenFragmentInMessage(groundedMessage, groundedNearby);
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
            knownRestaurantSlug:
              grounded.kitchen?.restaurantId === planRestaurantId
                ? grounded.kitchen.restaurantSlug
                : grounded.orderingContext?.restaurantSlug,
          });
          await prefetchKitchenMenuForAssist({
            restaurantId: planRestaurantId,
            restaurantSlug: pendingPlanRestaurantRef.current.restaurantSlug,
            restaurantName: grounded.kitchen?.displayName,
            lat: coords?.lat,
            lng: coords?.lng,
            force: true,
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
            const outcome = validationSpeakText(
              validation,
              grounded.kitchen?.displayName ?? kitchenOnlyHit?.name,
            );
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
            const friendly =
              /not\s*found/i.test(msg)
                ? 'I couldn’t match that dish on this kitchen’s live menu. Try another dish name, or open the kitchen menu.'
                : `Validation skipped: ${msg}`;
            setMessages((prev) => [
              ...prev,
              { id: nextId(), role: 'system', text: friendly },
            ]);
            return /not\s*found/i.test(msg) ? friendly : result.reply;
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
        const raw =
          err instanceof AssistantApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Assistant request failed';
        const friendly =
          /not\s*found/i.test(raw) || /HTTP_404/i.test(raw)
            ? 'I couldn’t find that kitchen or dish on today’s live menu. Try “Inti Bhojanam” or open a kitchen first.'
            : raw;
        setError(friendly);
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

  const hardStopVoiceSession = useCallback(() => {
    voiceAgentActiveRef.current = false;
    setVoiceAgentActive(false);
    setVoiceTurnPhase('idle');
    voiceAbortRef.current?.abort();
    voiceAbortRef.current = null;
    forceStopSpeechCapture();
    cancelListening();
    setListening(false);
    setSpeaking(false);
    try {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } catch {
      /* ignore */
    }
  }, [cancelListening, setListening, setSpeaking, voiceAbortRef]);

  const cancelVoice = useCallback(() => {
    hardStopVoiceSession();
  }, [hardStopVoiceSession]);

  const stopVoiceAgent = useCallback(() => {
    hardStopVoiceSession();
  }, [hardStopVoiceSession]);

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

      // Sheet closed or agent stopped — never open the mic.
      if (!sheetOpenRef.current) return 'abort';
      const agentMode = options?.agentMode === true || voiceAgentActiveRef.current;
      if (agentMode && !voiceAgentActiveRef.current) return 'abort';

      // Register abort controller BEFORE any await so Close can always kill this turn.
      const ac = new AbortController();
      voiceAbortRef.current = ac;

      // Barge-in: stop prior listen / TTS before opening the mic.
      forceStopSpeechCapture();
      try {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      } catch {
        /* ignore */
      }
      await new Promise((r) => setTimeout(r, 180));

      if (!sheetOpenRef.current || ac.signal.aborted || (agentMode && !voiceAgentActiveRef.current)) {
        hardStopVoiceSession();
        return 'abort';
      }

      setSpeaking(false);
      setError(null);
      setVoiceTurnPhase('listening');

      const listenOnce = () =>
        startListening({
          lang: voiceLanguage,
          agentMode,
          ac,
          isVoiceSessionLive: () =>
            sheetOpenRef.current &&
            !ac.signal.aborted &&
            (!agentMode || voiceAgentActiveRef.current),
        });

      try {
        let transcript: string;
        try {
          transcript = await listenOnce();
        } catch (firstErr) {
          // Agent mode: one quick soft-retry on empty/timeout before bubbling up.
          if (
            agentMode &&
            firstErr instanceof AssistantApiError &&
            (firstErr.code === 'AI_VOICE_EMPTY' || firstErr.code === 'AI_VOICE_TIMEOUT') &&
            sheetOpenRef.current &&
            voiceAgentActiveRef.current &&
            !ac.signal.aborted
          ) {
            await new Promise((r) => setTimeout(r, 220));
            if (!sheetOpenRef.current || !voiceAgentActiveRef.current || ac.signal.aborted) {
              hardStopVoiceSession();
              return 'abort';
            }
            setVoiceTurnPhase('listening');
            transcript = await listenOnce();
          } else {
            throw firstErr;
          }
        }

        if (!sheetOpenRef.current || (agentMode && !voiceAgentActiveRef.current)) {
          hardStopVoiceSession();
          return 'abort';
        }

        // Hold Thinking until assist + TTS finish — do not reopen mic mid-turn.
        setVoiceTurnPhase('thinking');

        const coords = activeLocation?.coordinates;
        // Ground STT against live menu once kitchen context exists; expand Telugu before correct.
        const preExpanded = normalizeQuantityAsr(expandIndicOrderingUtterance(transcript));
        const orderingContext = buildOrderingAssistContext({
          restaurantId,
          restaurantSlug,
          areaLabel: activeLocation?.displayLabel,
          lat: coords?.lat,
          lng: coords?.lng,
        });
        const corrected = correctTranscriptAgainstOrderingVocab(preExpanded, orderingContext);

        if (isStopVoiceAgentMessage(corrected)) {
          const bye = 'Voice agent paused. Tap the AI orb anytime to continue.';
          setMessages((prev) => [
            ...prev,
            { id: nextId(), role: 'user', text: corrected },
            { id: nextId(), role: 'assistant', text: bye },
          ]);
          setVoiceTurnPhase('speaking');
          await speakReply(bye, ac.signal, true);
          setVoiceTurnPhase('idle');
          return 'stop';
        }

        const reply = await send(corrected);
        if (!sheetOpenRef.current) {
          hardStopVoiceSession();
          return 'abort';
        }
        if (!reply?.trim()) {
          setVoiceTurnPhase('idle');
          return 'error';
        }
        setVoiceTurnPhase('speaking');
        await speakReply(reply, ac.signal, options?.forceSpeak === true || voiceAgentActiveRef.current);
        // Let TTS / cloud audio fully release the mic before the next listen.
        await new Promise((r) => setTimeout(r, agentMode ? 400 : 280));
        if (pauseLiveVoiceAfterTurnRef.current) {
          pauseLiveVoiceAfterTurnRef.current = false;
          hardStopVoiceSession();
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: 'system',
              text: 'Voice paused after adding to cart. Tap the AI button anytime to continue — nothing else is being recorded.',
            },
          ]);
          return 'stop';
        }
        if (!sheetOpenRef.current || (agentMode && !voiceAgentActiveRef.current)) {
          setVoiceTurnPhase('idle');
          return 'abort';
        }
        setVoiceTurnPhase('idle');
        return 'ok';
      } catch (err) {
        setVoiceTurnPhase('idle');
        if (err instanceof AssistantApiError) {
          if (err.code === 'AI_VOICE_ABORTED') return 'abort';
          // Soft-fail timeouts / Chrome "aborted" remaps in live agent — re-listen quietly.
          if (err.code === 'AI_VOICE_TIMEOUT' || err.code === 'AI_VOICE_EMPTY') {
            if (agentMode) return 'timeout';
            setError(err.message);
            return 'timeout';
          }
          if (
            agentMode &&
            err.code === 'AI_VOICE_ERROR' &&
            /interrupted|reset|try again/i.test(err.message)
          ) {
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
      hardStopVoiceSession,
      restaurantId,
      restaurantSlug,
      send,
      speakReply,
      voiceEnabled,
      startListening,
      setSpeaking,
      setError,
      voiceLanguage,
      voiceAbortRef,
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
    sheetOpenRef.current = true;
    setOpen(true);
    setError(null);

    const greeting =
      voiceLanguage.toLowerCase().startsWith('te')
        ? 'ఆర్డర్‌భోజన్ వాయిస్ ఏజెంట్ సిద్ధం. కిచెన్ లేదా డిష్ చెప్పండి — జోడించాలంటే confirm అనండి.'
        : voiceLanguage.toLowerCase().startsWith('hi')
          ? 'OrderBhojan वॉइस एजेंट तैयार है। किचन या डिश बोलें — जोड़ने के लिए confirm कहें।'
          : 'OrderBhojan Voice Agent ready. Tell me a kitchen or dish — say confirm to add a validated plan.';
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
    } finally {
      if (voiceAbortRef.current === greetAc) {
        voiceAbortRef.current = null;
      }
    }
    // Let TTS / cloud audio fully release the mic before listening (Chrome abort guard).
    await new Promise((r) => setTimeout(r, 500));

    let emptyListenStreak = 0;
    while (voiceAgentActiveRef.current && sheetOpenRef.current) {
      if (!sheetOpenRef.current || !voiceAgentActiveRef.current) break;
      if (loading || validating || applying || speaking || voiceTurnPhaseRef.current === 'thinking' || voiceTurnPhaseRef.current === 'speaking') {
        await new Promise((r) => setTimeout(r, 200));
        continue;
      }
      const outcome = await runVoiceTurn({ forceSpeak: true, agentMode: true });
      if (outcome === 'stop' || outcome === 'abort') {
        break;
      }
      if (outcome === 'timeout') {
        emptyListenStreak += 1;
        if (emptyListenStreak >= 2) {
          const nudge =
            voiceLanguage.toLowerCase().startsWith('te')
              ? 'మీ మాట వినిపించలేదు. మళ్లీ AI బటన్ నొక్కి స్పష్టంగా చెప్పండి.'
              : voiceLanguage.toLowerCase().startsWith('hi')
                ? 'आवाज़ साफ़ नहीं सुनाई दी। फिर से AI बटन दबाकर बोलें।'
                : 'I did not catch that. Tap the AI button and speak clearly when you are ready.';
          setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', text: nudge }]);
          try {
            const nudgeAc = new AbortController();
            voiceAbortRef.current = nudgeAc;
            setVoiceTurnPhase('speaking');
            await speakReply(nudge, nudgeAc.signal, true);
          } catch {
            /* non-fatal */
          } finally {
            setVoiceTurnPhase('idle');
          }
          break;
        }
        // Quiet soft re-listen — no red “No speech” spam.
        await new Promise((r) => setTimeout(r, 250));
        if (!voiceAgentActiveRef.current || !sheetOpenRef.current) break;
        continue;
      }
      emptyListenStreak = 0;
      if (outcome === 'error') {
        await new Promise((r) => setTimeout(r, 600));
        if (!voiceAgentActiveRef.current || !sheetOpenRef.current) break;
        continue;
      }
      await new Promise((r) => setTimeout(r, 280));
    }

    hardStopVoiceSession();
  }, [applying, hardStopVoiceSession, loading, runVoiceTurn, speakReply, speaking, validating, voiceEnabled, voiceLanguage, voiceCaptureAvailable, activeLocation, restaurantId, restaurantSlug]);

  const followHint = useCallback(
    (hint: ConsumerAssistHint) => {
      if (hint.type === 'none') return;
      const target = hint.target?.trim();
      if (!target) return;

      // Human escalation / external links — user tap only.
      if (/^(mailto:|tel:)/i.test(target)) {
        void openExternalUrl(target);
        sheetOpenRef.current = false;
        hardStopVoiceSession();
        setOpen(false);
        return;
      }
      if (hint.type === 'open_url' && /^https?:\/\//i.test(target)) {
        window.open(target, '_blank', 'noopener,noreferrer');
        return;
      }
      if (target.startsWith('/')) {
        navigate(target);
        sheetOpenRef.current = false;
        hardStopVoiceSession();
        setOpen(false);
      }
    },
    [hardStopVoiceSession, navigate],
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
        // Button confirm while live voice is on — stop mic so beeps don't continue.
        if (voiceAgentActiveRef.current) {
          hardStopVoiceSession();
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: 'system',
              text: 'Voice paused after adding to cart. Tap the AI button anytime to continue — nothing else is being recorded.',
            },
          ]);
        }
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
  }, [activeLocation, addItem, applying, hardStopVoiceSession, pendingValidation, setQuantity, syncPendingValidation]);

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
        sheetOpenRef.current = next;
        if (!next) {
          // Close must kill mic immediately — AbortController alone misses inter-turn gaps.
          voiceAgentActiveRef.current = false;
          setVoiceAgentActive(false);
          voiceAbortRef.current?.abort();
          voiceAbortRef.current = null;
          forceStopSpeechCapture();
          cancelListening();
          setListening(false);
          setSpeaking(false);
          try {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
              window.speechSynthesis.cancel();
            }
          } catch {
            /* ignore */
          }
        }
        return next;
      });
    },
    [cancelListening, setListening, setSpeaking, voiceAbortRef],
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
    voiceTurnPhase,
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
