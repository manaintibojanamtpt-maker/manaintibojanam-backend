/**
 * Session storage keys for voice-first experience anti-spam tracking.
 */
const SESSION_STORAGE_PREFIX = 'ob_voice_first_';
const SESSION_ID_KEY = `${SESSION_STORAGE_PREFIX}session_id`;
const GREETING_SHOWN_KEY = `${SESSION_STORAGE_PREFIX}greeting_shown`;
const GREETING_SPOKEN_KEY = `${SESSION_STORAGE_PREFIX}greeting_spoken`;
const GREETING_DISMISSED_KEY = `${SESSION_STORAGE_PREFIX}greeting_dismissed`;

const LOCAL_STORAGE_VISIT_KEY = 'ob_has_visited_before';

export type GreetingContextType = 'first_visit' | 'returning_cart' | 'kitchen' | 'general_returning';

export interface GreetingContextParams {
  cartItemCount?: number;
  restaurantName?: string;
  restaurantId?: string;
}

function getSafeSessionStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage;
    }
  } catch {
    /* Storage restricted or in private mode */
  }
  return null;
}

function getSafeLocalStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    /* Storage restricted */
  }
  return null;
}

/**
 * Initializes or returns the deterministic session ID for this browser tab session.
 */
export function getVoiceSessionId(): string {
  const session = getSafeSessionStorage();
  if (!session) return 'ephemeral-session';

  let sessionId = session.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = `vses_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    session.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

/**
 * Checks whether the proactive welcome greeting should trigger.
 * Strictly triggers at most ONCE per session and NEVER if previously dismissed or shown.
 */
export function shouldTriggerProactiveGreeting(): boolean {
  const session = getSafeSessionStorage();
  if (!session) return false;

  const shown = session.getItem(GREETING_SHOWN_KEY);
  const dismissed = session.getItem(GREETING_DISMISSED_KEY);

  return !shown && !dismissed;
}

/**
 * Records that the visual greeting was displayed in this session.
 */
export function markGreetingShown(): void {
  const session = getSafeSessionStorage();
  if (!session) return;
  session.setItem(GREETING_SHOWN_KEY, String(Date.now()));

  const local = getSafeLocalStorage();
  if (local) {
    local.setItem(LOCAL_STORAGE_VISIT_KEY, 'true');
  }
}

/**
 * Records that the audio greeting was successfully synthesized / played in this session.
 */
export function markGreetingSpoken(): void {
  const session = getSafeSessionStorage();
  if (!session) return;
  session.setItem(GREETING_SPOKEN_KEY, String(Date.now()));
}

/**
 * Checks if the greeting was already spoken in this session.
 */
export function hasGreetingBeenSpoken(): boolean {
  const session = getSafeSessionStorage();
  if (!session) return false;
  return Boolean(session.getItem(GREETING_SPOKEN_KEY));
}

/**
 * Records that the customer dismissed the greeting so it never pops up again in this session.
 */
export function markGreetingDismissed(): void {
  const session = getSafeSessionStorage();
  if (!session) return;
  session.setItem(GREETING_DISMISSED_KEY, String(Date.now()));
  session.setItem(GREETING_SHOWN_KEY, String(Date.now()));
}

/**
 * Resolves the appropriate contextual category based on user state.
 */
export function resolveGreetingContextType(params: GreetingContextParams): GreetingContextType {
  const local = getSafeLocalStorage();
  const hasVisited = local?.getItem(LOCAL_STORAGE_VISIT_KEY) === 'true';

  if (params.cartItemCount && params.cartItemCount > 0) {
    return 'returning_cart';
  }

  if (params.restaurantName && params.restaurantName.trim().length > 0) {
    return 'kitchen';
  }

  if (!hasVisited) {
    return 'first_visit';
  }

  return 'general_returning';
}

/**
 * Resets the greeting session state. For testing or explicit debug resets only.
 */
export function resetGreetingSession(): void {
  const session = getSafeSessionStorage();
  if (!session) return;
  session.removeItem(GREETING_SHOWN_KEY);
  session.removeItem(GREETING_SPOKEN_KEY);
  session.removeItem(GREETING_DISMISSED_KEY);
  session.removeItem(SESSION_ID_KEY);
}
