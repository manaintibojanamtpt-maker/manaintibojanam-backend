export const GUEST_ORDERS_KEY = 'mib_guest_orders';
export const GUEST_CHECKOUT_PHONE_KEY = 'lastGuestCheckoutPhone';
export const GUEST_TOKEN_KEY_PREFIX = 'bhojan_guest_token_';
export const GUEST_TOKEN_EXPIRY_KEY_PREFIX = 'bhojan_guest_token_exp_';

export const saveGuestOrder = (orderId: string) => {
  if (typeof window === 'undefined') return;
  try {
    const existing = localStorage.getItem(GUEST_ORDERS_KEY);
    let orders: string[] = [];
    if (existing) {
      orders = JSON.parse(existing);
    }
    if (!orders.includes(orderId)) {
      orders.push(orderId);
      localStorage.setItem(GUEST_ORDERS_KEY, JSON.stringify(orders));
    }
  } catch {
    // ignore localStorage failures
  }
};

export const getGuestOrders = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const existing = localStorage.getItem(GUEST_ORDERS_KEY);
    return existing ? JSON.parse(existing) : [];
  } catch {
    return [];
  }
};

export const guestTokenStorageKey = (orderId: string): string =>
  `${GUEST_TOKEN_KEY_PREFIX}${orderId}`;

export const guestTokenExpiryStorageKey = (orderId: string): string =>
  `${GUEST_TOKEN_EXPIRY_KEY_PREFIX}${orderId}`;

export const saveGuestViewToken = (
  orderId: string,
  token: string,
  expiresAt?: string
): void => {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(guestTokenStorageKey(orderId), token);
    if (expiresAt) {
      sessionStorage.setItem(guestTokenExpiryStorageKey(orderId), expiresAt);
    }
  } catch {
    // ignore sessionStorage failures
  }
};

export const getGuestViewToken = (orderId: string): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const token = sessionStorage.getItem(guestTokenStorageKey(orderId));
    if (!token) return null;

    const expiresAtRaw = sessionStorage.getItem(guestTokenExpiryStorageKey(orderId));
    if (expiresAtRaw) {
      const expiresAtMs = Date.parse(expiresAtRaw);
      if (!Number.isNaN(expiresAtMs) && Date.now() >= expiresAtMs) {
        clearGuestViewToken(orderId);
        return null;
      }
    }

    return token;
  } catch {
    return null;
  }
};

export const clearGuestViewToken = (orderId: string): void => {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(guestTokenStorageKey(orderId));
    sessionStorage.removeItem(guestTokenExpiryStorageKey(orderId));
  } catch {
    // ignore sessionStorage failures
  }
};

export const rememberGuestCheckoutPhone = (phone: string): void => {
  if (typeof window === 'undefined' || !phone.trim()) return;
  try {
    sessionStorage.setItem(GUEST_CHECKOUT_PHONE_KEY, phone.trim());
  } catch {
    // ignore sessionStorage failures
  }
};

export const getGuestCheckoutPhone = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(GUEST_CHECKOUT_PHONE_KEY);
  } catch {
    return null;
  }
};
