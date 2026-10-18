/**
 * M0 — Guest order view JWT (ADR-012).
 * Stateless HMAC-signed tokens scoped to a single orderId.
 */

import jwt from 'jsonwebtoken';

export const GUEST_TOKEN_TTL_SECONDS = 24 * 60 * 60;
export const GUEST_TOKEN_ISSUER = 'bhojanos-api';
export const GUEST_TOKEN_AUDIENCE = 'bhojan-guest-order-view';
export const GUEST_AUTH_SCHEME_PREFIX = 'Guest ';

export interface GuestOrderTokenPayload {
  orderId: string;
  iat?: number;
  exp?: number;
}

export type GuestOrderTokenErrorCode =
  | 'MISSING_SECRET'
  | 'INVALID_TOKEN'
  | 'EXPIRED'
  | 'ORDER_MISMATCH'
  | 'MALFORMED';

export class GuestOrderTokenError extends Error {
  readonly code: GuestOrderTokenErrorCode;

  constructor(message: string, code: GuestOrderTokenErrorCode) {
    super(message);
    this.name = 'GuestOrderTokenError';
    this.code = code;
  }
}

export const getGuestTokenSecret = (): string => {
  const secret = process.env.ORDER_GUEST_TOKEN_SECRET;
  if (!secret || secret.length < 32) {
    throw new GuestOrderTokenError(
      'ORDER_GUEST_TOKEN_SECRET must be set and at least 32 characters',
      'MISSING_SECRET'
    );
  }
  return secret;
};

export interface SignGuestOrderTokenOptions {
  secret?: string;
  ttlSeconds?: number;
}

export const signGuestOrderToken = (
  orderId: string,
  options: SignGuestOrderTokenOptions = {}
): { token: string; expiresAt: Date } => {
  const trimmedOrderId = orderId.trim();
  if (!trimmedOrderId) {
    throw new GuestOrderTokenError('orderId is required', 'MALFORMED');
  }

  const secret = options.secret ?? getGuestTokenSecret();
  const ttlSeconds = options.ttlSeconds ?? GUEST_TOKEN_TTL_SECONDS;
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  const token = jwt.sign(
    { orderId: trimmedOrderId },
    secret,
    {
      algorithm: 'HS256',
      expiresIn: ttlSeconds,
      audience: GUEST_TOKEN_AUDIENCE,
      issuer: GUEST_TOKEN_ISSUER,
    }
  );

  return { token, expiresAt };
};

export interface VerifyGuestOrderTokenOptions {
  secret?: string;
}

export const verifyGuestOrderToken = (
  token: string,
  expectedOrderId: string,
  options: VerifyGuestOrderTokenOptions = {}
): GuestOrderTokenPayload => {
  const secret = options.secret ?? getGuestTokenSecret();
  const trimmedExpectedOrderId = expectedOrderId.trim();

  if (!token.trim()) {
    throw new GuestOrderTokenError('Token is required', 'INVALID_TOKEN');
  }
  if (!trimmedExpectedOrderId) {
    throw new GuestOrderTokenError('expectedOrderId is required', 'MALFORMED');
  }

  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      audience: GUEST_TOKEN_AUDIENCE,
      issuer: GUEST_TOKEN_ISSUER,
    });

    if (typeof decoded !== 'object' || decoded === null) {
      throw new GuestOrderTokenError('Invalid guest order token payload', 'MALFORMED');
    }

    const orderId = (decoded as jwt.JwtPayload).orderId;
    if (typeof orderId !== 'string' || !orderId.trim()) {
      throw new GuestOrderTokenError('Token missing orderId claim', 'MALFORMED');
    }

    if (orderId !== trimmedExpectedOrderId) {
      throw new GuestOrderTokenError('Token orderId does not match request', 'ORDER_MISMATCH');
    }

    const payload = decoded as jwt.JwtPayload;
    return {
      orderId,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch (error) {
    if (error instanceof GuestOrderTokenError) {
      throw error;
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new GuestOrderTokenError('Guest order token expired', 'EXPIRED');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new GuestOrderTokenError('Invalid guest order token', 'INVALID_TOKEN');
    }
    throw error;
  }
};

/** Extract guest JWT from `Authorization: Guest <jwt>`. */
export const parseGuestAuthorizationHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) {
    return null;
  }
  const trimmed = authHeader.trim();
  if (!trimmed.startsWith(GUEST_AUTH_SCHEME_PREFIX)) {
    return null;
  }
  const token = trimmed.slice(GUEST_AUTH_SCHEME_PREFIX.length).trim();
  return token || null;
};
