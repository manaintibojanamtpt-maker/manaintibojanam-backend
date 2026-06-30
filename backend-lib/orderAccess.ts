/**
 * M0 — Order read access policy (docs/specs/M0-security.md §5).
 */

import {
  GuestOrderTokenError,
  parseGuestAuthorizationHeader,
  verifyGuestOrderToken,
} from './guestOrderToken';

export interface OrderRecord {
  userId?: string | null;
  tenantId?: string;
}

export interface FirebaseAuthUser {
  uid: string;
  admin?: boolean;
}

export interface OrderReadAuthContext {
  requestedOrderId: string;
  order: OrderRecord;
  firebaseUser?: FirebaseAuthUser;
  /** orderId from a verified guest JWT (must match requestedOrderId). */
  guestOrderId?: string;
  ownedTenantIds?: string[];
}

export type OrderReadAccessReason =
  | 'admin'
  | 'order_owner'
  | 'tenant_owner'
  | 'guest_token'
  | 'self'
  | 'unauthenticated'
  | 'forbidden';

export interface OrderReadAccessResult {
  allowed: boolean;
  reason: OrderReadAccessReason;
}

export interface OrderAccessUserLoader {
  getOwnedTenantIds: (uid: string) => Promise<string[]>;
}

export const normalizePhoneDigits = (phone: string): string => phone.replace(/\D/g, '');

const normalizePhoneForComparison = (digits: string): string => {
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
};

export const phonesEquivalent = (orderPhone: string, inputPhone: string): boolean => {
  const normalizedOrder = normalizePhoneForComparison(normalizePhoneDigits(orderPhone));
  const normalizedInput = normalizePhoneForComparison(normalizePhoneDigits(inputPhone));
  if (!normalizedOrder || !normalizedInput) {
    return false;
  }
  if (normalizedOrder === normalizedInput) {
    return true;
  }
  if (normalizedOrder.length === 10 && normalizedInput.endsWith(normalizedOrder)) {
    return true;
  }
  if (normalizedInput.length === 10 && normalizedOrder.endsWith(normalizedInput)) {
    return true;
  }
  return false;
};

export interface PhoneVerificationInput {
  phone?: string;
  phoneLast4?: string;
}

/** Used by guest-view-token issuance (PR-3). */
export const phoneMatchesOrder = (
  orderPhone: string,
  input: PhoneVerificationInput
): boolean => {
  const normalizedOrderPhone = normalizePhoneDigits(orderPhone);
  if (!normalizedOrderPhone) {
    return false;
  }

  if (input.phone) {
    return phonesEquivalent(orderPhone, input.phone);
  }

  if (input.phoneLast4) {
    const last4 = normalizePhoneDigits(input.phoneLast4);
    if (last4.length !== 4) {
      return false;
    }
    return normalizedOrderPhone.endsWith(last4);
  }

  return false;
};

export const evaluateOrderReadAccess = (ctx: OrderReadAuthContext): OrderReadAccessResult => {
  const {
    requestedOrderId,
    order,
    firebaseUser,
    guestOrderId,
    ownedTenantIds = [],
  } = ctx;

  if (firebaseUser?.admin === true) {
    return { allowed: true, reason: 'admin' };
  }

  if (firebaseUser?.uid && order.userId && firebaseUser.uid === order.userId) {
    return { allowed: true, reason: 'order_owner' };
  }

  if (firebaseUser?.uid && order.tenantId && ownedTenantIds.includes(order.tenantId)) {
    return { allowed: true, reason: 'tenant_owner' };
  }

  if (guestOrderId && guestOrderId === requestedOrderId) {
    return { allowed: true, reason: 'guest_token' };
  }

  if (!firebaseUser && !guestOrderId) {
    return { allowed: false, reason: 'unauthenticated' };
  }

  return { allowed: false, reason: 'forbidden' };
};

export const resolveOrderReadAccess = async (
  ctx: Omit<OrderReadAuthContext, 'ownedTenantIds'> & { ownedTenantIds?: string[] },
  loader?: OrderAccessUserLoader
): Promise<OrderReadAccessResult> => {
  let ownedTenantIds = ctx.ownedTenantIds;

  if (!ownedTenantIds && ctx.firebaseUser?.uid && loader) {
    ownedTenantIds = await loader.getOwnedTenantIds(ctx.firebaseUser.uid);
  }

  return evaluateOrderReadAccess({
    ...ctx,
    ownedTenantIds: ownedTenantIds ?? [],
  });
};

export interface GuestCredentialResolution {
  guestOrderId?: string;
  error?: GuestOrderTokenError;
}

/** Verify guest JWT from Authorization header or raw token for a requested order. */
export const resolveGuestCredential = (
  authHeader: string | undefined,
  requestedOrderId: string,
  options: { secret?: string; guestToken?: string } = {}
): GuestCredentialResolution => {
  const token =
    options.guestToken?.trim() ||
    parseGuestAuthorizationHeader(authHeader) ||
    undefined;

  if (!token) {
    return {};
  }

  try {
    const payload = verifyGuestOrderToken(
      token,
      requestedOrderId,
      options.secret ? { secret: options.secret } : {}
    );
    return { guestOrderId: payload.orderId };
  } catch (error) {
    if (error instanceof GuestOrderTokenError) {
      return { error };
    }
    throw error;
  }
};

export const isOrderAuthEnforced = (): boolean => {
  const value = (process.env.FF_ORDER_AUTH_ENFORCE || '').trim().toLowerCase();
  return value === 'true' || value === '1' || value === 'yes';
};

export const isRazorpayDraftBindEnforced = (): boolean => {
  const value = (process.env.FF_RAZORPAY_DRAFT_BIND || '').trim().toLowerCase();
  return value === 'true' || value === '1' || value === 'yes';
};

/** Resolve draft owner from top-level or nested orderPayload (M0 PR-7). */
export const extractDraftUserId = (draftData: Record<string, unknown>): string | null => {
  const topLevel = draftData.userId;
  if (typeof topLevel === 'string' && topLevel.trim()) {
    return topLevel.trim();
  }

  const payload = draftData.orderPayload;
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const payloadUserId = (payload as Record<string, unknown>).userId;
    if (typeof payloadUserId === 'string' && payloadUserId.trim()) {
      return payloadUserId.trim();
    }
  }

  return null;
};

export const evaluateRazorpayDraftBindAccess = (
  draftUserId: string | null,
  firebaseUser?: FirebaseAuthUser
): OrderReadAccessResult => {
  if (!draftUserId) {
    return { allowed: true, reason: 'guest_token' };
  }

  if (!firebaseUser?.uid) {
    return { allowed: false, reason: 'unauthenticated' };
  }

  if (firebaseUser.uid === draftUserId) {
    return { allowed: true, reason: 'order_owner' };
  }

  return { allowed: false, reason: 'forbidden' };
};

export interface AssertRazorpayDraftBindInput {
  draftUserId: string | null;
  authHeader?: string;
  verifyFirebaseToken?: (token: string) => Promise<FirebaseAuthUser>;
}

export const assertRazorpayDraftBindAccess = async (
  input: AssertRazorpayDraftBindInput
): Promise<OrderReadAccessDecision> => {
  let firebaseUser: FirebaseAuthUser | undefined;

  if (input.authHeader?.startsWith('Bearer ')) {
    const bearerToken = input.authHeader.slice('Bearer '.length).trim();
    if (!bearerToken) {
      return {
        allowed: false,
        reason: 'unauthenticated',
        statusCode: 401,
        error: `${UNAUTHORIZED}: No token provided`,
      };
    }
    if (!input.verifyFirebaseToken) {
      return {
        allowed: false,
        reason: 'unauthenticated',
        statusCode: 401,
        error: `${UNAUTHORIZED}: No token provided`,
      };
    }
    try {
      firebaseUser = await input.verifyFirebaseToken(bearerToken);
    } catch {
      return {
        allowed: false,
        reason: 'unauthenticated',
        statusCode: 401,
        error: `${UNAUTHORIZED}: Invalid token`,
      };
    }
  }

  const access = evaluateRazorpayDraftBindAccess(input.draftUserId, firebaseUser);

  if (access.allowed) {
    return { allowed: true, reason: access.reason };
  }

  if (access.reason === 'unauthenticated') {
    return {
      allowed: false,
      reason: access.reason,
      statusCode: 401,
      error: `${UNAUTHORIZED}: Authentication required for this order draft`,
    };
  }

  return {
    allowed: false,
    reason: access.reason,
    statusCode: 403,
    error: `${FORBIDDEN}: Draft access denied`,
  };
};

export interface OrderReadAccessDecision {
  allowed: boolean;
  reason: OrderReadAccessReason;
  statusCode?: 401 | 403;
  error?: string;
}

export interface AssertOrderReadAccessInput {
  requestedOrderId: string;
  order: OrderRecord;
  authHeader?: string;
  guestToken?: string;
  verifyFirebaseToken?: (token: string) => Promise<FirebaseAuthUser>;
  getOwnedTenantIds?: (uid: string) => Promise<string[]>;
}

const UNAUTHORIZED = 'Unauthorized';
const FORBIDDEN = 'Forbidden';

export const assertOrderReadAccess = async (
  input: AssertOrderReadAccessInput
): Promise<OrderReadAccessDecision> => {
  const authHeader = input.authHeader;
  let firebaseUser: FirebaseAuthUser | undefined;
  let guestOrderId: string | undefined;
  let guestTokenError: GuestOrderTokenError | undefined;

  if (authHeader?.startsWith('Bearer ')) {
    const bearerToken = authHeader.slice('Bearer '.length).trim();
    if (!bearerToken) {
      return {
        allowed: false,
        reason: 'unauthenticated',
        statusCode: 401,
        error: `${UNAUTHORIZED}: No token provided`,
      };
    }
    if (!input.verifyFirebaseToken) {
      return {
        allowed: false,
        reason: 'unauthenticated',
        statusCode: 401,
        error: `${UNAUTHORIZED}: No token provided`,
      };
    }
    try {
      firebaseUser = await input.verifyFirebaseToken(bearerToken);
    } catch {
      return {
        allowed: false,
        reason: 'unauthenticated',
        statusCode: 401,
        error: `${UNAUTHORIZED}: Invalid token`,
      };
    }
  }

  const guestResolution = resolveGuestCredential(authHeader, input.requestedOrderId, {
    guestToken: input.guestToken,
  });
  guestOrderId = guestResolution.guestOrderId;
  guestTokenError = guestResolution.error;

  if (guestTokenError) {
    return {
      allowed: false,
      reason: 'unauthenticated',
      statusCode: 401,
      error: `${UNAUTHORIZED}: Invalid guest order token`,
    };
  }

  const access = await resolveOrderReadAccess(
    {
      requestedOrderId: input.requestedOrderId,
      order: input.order,
      firebaseUser,
      guestOrderId,
    },
    input.getOwnedTenantIds
      ? { getOwnedTenantIds: input.getOwnedTenantIds }
      : undefined
  );

  if (access.allowed) {
    return { allowed: true, reason: access.reason };
  }

  if (access.reason === 'unauthenticated') {
    return {
      allowed: false,
      reason: access.reason,
      statusCode: 401,
      error: `${UNAUTHORIZED}: Order access credentials required`,
    };
  }

  return {
    allowed: false,
    reason: access.reason,
    statusCode: 403,
    error: `${FORBIDDEN}: Order access denied`,
  };
};

export const assertOrderPatchAccess = async (
  input: Omit<AssertOrderReadAccessInput, 'guestToken'>
): Promise<OrderReadAccessDecision> => {
  const authHeader = input.authHeader;
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      allowed: false,
      reason: 'unauthenticated',
      statusCode: 403,
      error: `${FORBIDDEN}: Authentication required. Use PATCH /api/orders/:id/status`,
    };
  }

  const bearerToken = authHeader.slice('Bearer '.length).trim();
  if (!bearerToken || !input.verifyFirebaseToken) {
    return {
      allowed: false,
      reason: 'unauthenticated',
      statusCode: 403,
      error: `${FORBIDDEN}: Authentication required. Use PATCH /api/orders/:id/status`,
    };
  }

  let firebaseUser: FirebaseAuthUser;
  try {
    firebaseUser = await input.verifyFirebaseToken(bearerToken);
  } catch {
    return {
      allowed: false,
      reason: 'unauthenticated',
      statusCode: 401,
      error: `${UNAUTHORIZED}: Invalid token`,
    };
  }

  let ownedTenantIds: string[] = [];
  if (input.getOwnedTenantIds) {
    ownedTenantIds = await input.getOwnedTenantIds(firebaseUser.uid);
  }

  if (firebaseUser.admin === true) {
    return { allowed: true, reason: 'admin' };
  }

  if (input.order.tenantId && ownedTenantIds.includes(input.order.tenantId)) {
    return { allowed: true, reason: 'tenant_owner' };
  }

  return {
    allowed: false,
    reason: 'forbidden',
    statusCode: 403,
    error: `${FORBIDDEN}: Owner or admin access required. Use PATCH /api/orders/:id/status`,
  };
};

export const canListOrdersForUser = (
  firebaseUser: FirebaseAuthUser,
  requestedUserId: string
): boolean => firebaseUser.admin === true || firebaseUser.uid === requestedUserId;

export const assertOrderUserListAccess = (
  firebaseUser: FirebaseAuthUser,
  requestedUserId: string
): OrderReadAccessDecision => {
  if (canListOrdersForUser(firebaseUser, requestedUserId)) {
    return {
      allowed: true,
      reason: firebaseUser.admin === true ? 'admin' : 'self',
    };
  }

  return {
    allowed: false,
    reason: 'forbidden',
    statusCode: 403,
    error: `${FORBIDDEN}: Cannot access another user's orders`,
  };
};

export const evaluateOrderNotifyAccess = (
  firebaseUser: FirebaseAuthUser,
  order: OrderRecord,
  ownedTenantIds: string[] = []
): OrderReadAccessResult => {
  if (firebaseUser.admin === true) {
    return { allowed: true, reason: 'admin' };
  }

  if (order.tenantId && ownedTenantIds.includes(order.tenantId)) {
    return { allowed: true, reason: 'tenant_owner' };
  }

  return { allowed: false, reason: 'forbidden' };
};

export const assertOrderNotifyAccess = async (input: {
  firebaseUser: FirebaseAuthUser;
  order: OrderRecord;
  getOwnedTenantIds?: (uid: string) => Promise<string[]>;
}): Promise<OrderReadAccessDecision> => {
  let ownedTenantIds: string[] = [];
  if (input.getOwnedTenantIds) {
    ownedTenantIds = await input.getOwnedTenantIds(input.firebaseUser.uid);
  }

  const access = evaluateOrderNotifyAccess(
    input.firebaseUser,
    input.order,
    ownedTenantIds
  );

  if (access.allowed) {
    return { allowed: true, reason: access.reason };
  }

  return {
    allowed: false,
    reason: 'forbidden',
    statusCode: 403,
    error: `${FORBIDDEN}: Owner or admin access required`,
  };
};
