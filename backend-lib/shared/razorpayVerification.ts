import { createHmac } from 'crypto';
import type { Request } from 'express';

/**
 * Razorpay signature verification utilities
 * Supports both order payments and subscription events
 */

export interface RazorpaySignatureParams {
  orderId?: string;
  paymentId?: string;
  subscriptionId?: string;
  signature: string;
}

/**
 * Verify Razorpay signature for order payments
 * Format: order_id + "|" + payment_id
 */
export function verifyOrderPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean {
  if (!orderId || !paymentId || !signature || !secret) {
    return false;
  }

  const expectedSignature = createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return expectedSignature === signature;
}

/**
 * Verify Razorpay signature for subscription events
 * For subscription events, the signature is computed over the raw webhook payload
 * Using the webhook secret (not the key secret)
 */
export function verifySubscriptionWebhookSignature(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): boolean {
  if (!payload || !signature || !webhookSecret) {
    return false;
  }

  const expectedSignature = createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex');

  return expectedSignature === signature;
}

/**
 * Verify Razorpay signature for subscription payment verification
 * When confirming a subscription payment, the signature is over subscription_id + "|" + payment_id
 */
export function verifySubscriptionPaymentSignature(
  subscriptionId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean {
  if (!subscriptionId || !paymentId || !signature || !secret) {
    return false;
  }

  const expectedSignature = createHmac('sha256', secret)
    .update(`${subscriptionId}|${paymentId}`)
    .digest('hex');

  return expectedSignature === signature;
}

/**
 * Unified verification function that handles all Razorpay signature types
 */
export function verifyRazorpaySignature(
  params: RazorpaySignatureParams,
  secret: string,
  webhookSecret?: string
): boolean {
  // Webhook signature (raw payload)
  if (webhookSecret && params.signature) {
    // This is a webhook call - payload should be the raw body
    // We can't verify here without the raw payload, caller should use verifySubscriptionWebhookSignature
    return false;
  }

  // Order payment signature
  if (params.orderId && params.paymentId) {
    return verifyOrderPaymentSignature(params.orderId, params.paymentId, params.signature, secret);
  }

  // Subscription payment signature
  if (params.subscriptionId && params.paymentId) {
    return verifySubscriptionPaymentSignature(params.subscriptionId, params.paymentId, params.signature, secret);
  }

  return false;
}

/**
 * Extract signature verification parameters from request
 */
export function extractSignatureParams(req: Request): RazorpaySignatureParams {
  const body = req.body;

  // Handle both webhook (raw body) and API confirmation (JSON body)
  if (Buffer.isBuffer(body)) {
    // Webhook - raw payload, signature in header
    return {
      signature: req.headers['x-razorpay-signature'] as string,
    };
  }

  // API confirmation - JSON body
  return {
    orderId: body.razorpay_order_id || body.order_id,
    paymentId: body.razorpay_payment_id || body.payment_id,
    subscriptionId: body.razorpay_subscription_id || body.subscription_id,
    signature: body.razorpay_signature || body.signature,
  };
}

/**
 * Middleware to verify Razorpay webhook signatures
 * Uses the webhook secret for webhook events
 */
export function createRazorpayWebhookVerificationMiddleware(webhookSecret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const signature = req.headers['x-razorpay-signature'] as string;

    if (!signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing Razorpay signature header',
      });
    }

    if (!webhookSecret) {
      console.error('[Razorpay] Webhook secret not configured');
      return res.status(500).json({
        success: false,
        error: 'Webhook verification not configured',
      });
    }

    // Get raw body (must use express.raw() middleware before this)
    const payload = req.body;

    if (!payload || !Buffer.isBuffer(payload)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payload for signature verification',
      });
    }

    const verified = verifySubscriptionWebhookSignature(payload, signature, webhookSecret);

    if (!verified) {
      console.warn('[Razorpay] Webhook signature verification failed', {
        path: req.path,
        signature: signature.substring(0, 10) + '...',
      });
      return res.status(400).json({
        success: false,
        error: 'Invalid webhook signature',
      });
    }

    // Parse JSON body for downstream handlers
    try {
      req.body = JSON.parse(payload.toString());
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Invalid JSON payload',
      });
    }

    next();
  };
}

import type { Response, NextFunction } from 'express';