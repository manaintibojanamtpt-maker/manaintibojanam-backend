import { getAppConfig } from '@/config';
import { fetchBearerToken } from '@/features/auth/application/authService';
import { obDebugTrustEvent } from '@/lib/obDebug';
import { formatCustomerOrderLabel } from '../domain/orderDisplay';
import { enterRazorpayNativeChrome, exitRazorpayNativeChrome } from './razorpayNativeChrome';

const RAZORPAY_SCRIPT_ID = 'razorpay-checkout-js';
const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

let loadPromise: Promise<boolean> | null = null;
let checkoutOpen = false;

/** Warm Razorpay SDK while checkout quote loads — COD path never awaits this. */
export function prefetchRazorpayCheckoutScript(): void {
  if (typeof window === 'undefined') return;
  void loadRazorpayScript();
}

function uniqueRazorpayModalId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export interface RazorpayPaymentResponse {
  readonly razorpay_order_id: string;
  readonly razorpay_payment_id: string;
  readonly razorpay_signature: string;
}

export interface CreateRazorpayOrderResult {
  readonly razorpayOrderId: string;
  readonly amount: number;
  readonly currency: string;
  readonly key: string;
  readonly isMock: boolean;
}

export interface VerifyRazorpayPaymentResult {
  readonly orderId: string;
  readonly orderNumber?: number | string | null;
  readonly verified: boolean;
}

function getApiBaseUrl(): string {
  return getAppConfig().marketplaceApiBaseUrl.replace(/\/$/, '');
}

async function paymentRequestHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = await fetchBearerToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }

  if ((window as RazorpayWindow).Razorpay) {
    return Promise.resolve(true);
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve) => {
    const finish = (success: boolean) => {
      if (!success) {
        loadPromise = null;
      }
      resolve(success);
    };

    const existing = document.getElementById(RAZORPAY_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => finish(Boolean((window as RazorpayWindow).Razorpay)), {
        once: true,
      });
      existing.addEventListener('error', () => finish(false), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = RAZORPAY_SCRIPT_ID;
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;

    const timeout = window.setTimeout(() => finish(false), 15_000);

    script.onload = () => {
      window.clearTimeout(timeout);
      finish(Boolean((window as RazorpayWindow).Razorpay));
    };

    script.onerror = () => {
      window.clearTimeout(timeout);
      script.remove();
      finish(false);
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}

async function ensureRazorpayLoaded(): Promise<void> {
  const loaded = await loadRazorpayScript();
  if (!loaded) {
    throw new Error(
      'Razorpay SDK failed to load. Please disable your adblocker or try Cash on Delivery.',
    );
  }
}

interface RazorpayWindow extends Window {
  Razorpay?: new (options: Record<string, unknown>) => {
    open: () => void;
    on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void;
  };
}

async function paymentFetchJson<T>(
  path: string,
  body: Record<string, unknown>,
  attempts = 3,
): Promise<T> {
  const url = `${getApiBaseUrl()}${path}`;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: await paymentRequestHeaders(),
        body: JSON.stringify(body),
      });

      const data = (await response.json().catch(() => ({}))) as T & {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || data.success === false) {
        throw new Error(
          (typeof data.error === 'string' && data.error) ||
            `Payment request failed (${response.status})`,
        );
      }

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err ?? '');
      lastError =
        /failed to fetch|networkerror|load failed|network request failed/i.test(message)
          ? new Error(
              'Couldn’t reach payment servers. Check your connection and try again.',
            )
          : err instanceof Error
            ? err
            : new Error(message || 'Payment request failed');

      const retryable =
        /couldn’t reach|failed to fetch|network|timed out|503|502|429/i.test(
          lastError.message,
        ) || /failed to fetch|networkerror/i.test(message);

      if (!retryable || attempt >= attempts - 1) {
        throw lastError;
      }
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }

  throw lastError ?? new Error('Payment request failed');
}

export async function createRazorpayOrder(params: {
  readonly draftId: string;
  readonly userId?: string | null;
}): Promise<CreateRazorpayOrderResult> {
  const data = await paymentFetchJson<{
    success?: boolean;
    isMock?: boolean;
    order?: { id: string; amount: number; currency?: string };
    key?: string;
    error?: string;
  }>('/api/create-razorpay-order', {
    draftId: params.draftId,
    userId: params.userId ?? undefined,
  });

  if (!data.order?.id) {
    throw new Error(data.error || 'Failed to create secure payment session');
  }

  return {
    razorpayOrderId: data.order.id,
    amount: data.order.amount,
    currency: data.order.currency ?? 'INR',
    key: data.key ?? import.meta.env.VITE_RAZORPAY_KEY_ID ?? '',
    isMock: data.isMock === true,
  };
}

export async function verifyRazorpayPayment(
  payment: RazorpayPaymentResponse,
  draftId: string,
): Promise<VerifyRazorpayPaymentResult> {
  const data = await paymentFetchJson<{
    success?: boolean;
    verified?: boolean;
    orderId?: string;
    orderNumber?: number | string | null;
    error?: string;
  }>('/api/verify-razorpay-payment', {
    ...payment,
    draftId,
  });

  return {
    orderId: data.orderId ?? draftId,
    orderNumber: data.orderNumber ?? null,
    verified: data.verified !== false,
  };
}

export async function openRazorpayCheckout(options: {
  readonly draftId: string;
  readonly razorpayOrderId: string;
  readonly amount: number;
  readonly currency: string;
  readonly key: string;
  readonly phone: string;
  readonly customerName?: string;
  readonly customerEmail?: string;
  readonly merchantName?: string;
  readonly isMock: boolean;
}): Promise<RazorpayPaymentResponse> {
  if (options.isMock) {
    return {
      razorpay_order_id: options.razorpayOrderId,
      razorpay_payment_id: 'mock_payment',
      razorpay_signature: 'mock_signature',
    };
  }

  await ensureRazorpayLoaded();
  await enterRazorpayNativeChrome();

  if (checkoutOpen) {
    await exitRazorpayNativeChrome();
    throw new Error('Payment is already in progress. Close the payment window and try again.');
  }

  return new Promise((resolve, reject) => {
    const Razorpay = (window as RazorpayWindow).Razorpay;
    if (!Razorpay) {
      void exitRazorpayNativeChrome();
      reject(new Error('Razorpay SDK is unavailable'));
      return;
    }

    checkoutOpen = true;
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      checkoutOpen = false;
      void exitRazorpayNativeChrome().finally(fn);
    };

    try {
      const rzp = new Razorpay({
        key: options.key,
        amount: options.amount,
        currency: options.currency,
        name: options.merchantName ?? 'OrderBhojan',
        description: `Order ${options.draftId}`,
        order_id: options.razorpayOrderId,
        modal_id: uniqueRazorpayModalId('ob_checkout'),
        prefill: {
          name: options.customerName?.trim() || undefined,
          email: options.customerEmail?.trim().toLowerCase() || undefined,
          contact: options.phone.replace(/\D/g, '').slice(-10),
        },
        theme: { color: '#ff7a00' },
        handler: (response: RazorpayPaymentResponse) => {
          finish(() => resolve(response));
        },
        modal: {
          ondismiss: () => {
            finish(() => reject(new Error('Payment window closed')));
          },
          escape: true,
          confirm_close: true,
          backdropclose: false,
        },
        method: {
          upi: true,
          card: true,
          netbanking: true,
          wallet: true,
        },
      });

      rzp.on('payment.failed', (response) => {
        finish(() => reject(new Error(response.error?.description || 'Payment failed')));
      });

      rzp.open();
    } catch (err) {
      finish(() =>
        reject(
          err instanceof Error
            ? err
            : new Error('Unable to open Razorpay. Try Pay via UPI or Cash on delivery.'),
        ),
      );
    }
  });
}

export async function runRazorpayCheckoutFlow(params: {
  readonly draftId: string;
  readonly phone: string;
  readonly customerName?: string;
  readonly customerEmail?: string;
  readonly userId?: string | null;
  readonly merchantName?: string;
  readonly orderNumber?: number | string | null;
  readonly expectedAmountPaise?: number;
}): Promise<{ orderId: string; orderNumber: string }> {
  obDebugTrustEvent(
    'razorpay',
    'before create-razorpay-order',
    {
      draftId: params.draftId,
      expectedAmountPaise: params.expectedAmountPaise ?? null,
    },
    {
      razorpayAmountPaise: params.expectedAmountPaise ?? null,
    },
  );

  // Warm SDK + native chrome in parallel with order creation — cuts "Please wait…"
  // and avoids system-nav overlap when the modal mounts.
  let chromeReady = false;
  try {
    const [, , session] = await Promise.all([
      loadRazorpayScript(),
      enterRazorpayNativeChrome().then(() => {
        chromeReady = true;
      }),
      createRazorpayOrder({
        draftId: params.draftId,
        userId: params.userId,
      }),
    ]);

    obDebugTrustEvent(
      'razorpay',
      'create-razorpay-order response',
      {
        draftId: params.draftId,
        amountPaise: session.amount,
        razorpayOrderId: session.razorpayOrderId,
        expectedAmountPaise: params.expectedAmountPaise ?? null,
        amountMatchesExpected:
          params.expectedAmountPaise == null ? null : session.amount === params.expectedAmountPaise,
      },
      {
        razorpayAmountPaise: session.amount,
      },
    );

    const paymentResponse = await openRazorpayCheckout({
      draftId: params.draftId,
      razorpayOrderId: session.razorpayOrderId,
      amount: session.amount,
      currency: session.currency,
      key: session.key,
      phone: params.phone,
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      merchantName: params.merchantName,
      isMock: session.isMock,
    });

    const verified = await verifyRazorpayPayment(paymentResponse, params.draftId);
    return {
      orderId: verified.orderId,
      orderNumber: formatCustomerOrderLabel(
        verified.orderNumber ?? params.orderNumber,
        verified.orderId,
      ),
    };
  } catch (err) {
    if (chromeReady && !checkoutOpen) {
      await exitRazorpayNativeChrome();
    }
    throw err;
  }
}

export async function createSubscriptionRazorpayOrder(params: {
  readonly planId: string;
  readonly userId: string;
}): Promise<CreateRazorpayOrderResult> {
  const response = await fetch(`${getApiBaseUrl()}/api/create-razorpay-order`, {
    method: 'POST',
    headers: await paymentRequestHeaders(),
    body: JSON.stringify({
      planId: params.planId,
      userId: params.userId,
    }),
  });

  const data = (await response.json()) as {
    success?: boolean;
    isMock?: boolean;
    order?: { id: string; amount: number; currency?: string };
    key?: string;
    error?: string;
  };

  if (!response.ok || !data.success || !data.order?.id) {
    throw new Error(data.error || 'Failed to create secure payment session');
  }

  return {
    razorpayOrderId: data.order.id,
    amount: data.order.amount,
    currency: data.order.currency ?? 'INR',
    key: data.key ?? import.meta.env.VITE_RAZORPAY_KEY_ID ?? '',
    isMock: data.isMock === true,
  };
}

export async function verifySubscriptionRazorpayPayment(
  payment: RazorpayPaymentResponse,
): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/api/verify-razorpay-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payment),
  });

  const data = (await response.json()) as {
    success?: boolean;
    verified?: boolean;
    error?: string;
  };

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Payment could not be confirmed');
  }
}

export async function openSubscriptionRazorpayCheckout(options: {
  readonly razorpayOrderId: string;
  readonly amount: number;
  readonly currency: string;
  readonly key: string;
  readonly merchantName: string;
  readonly customerName?: string;
  readonly customerEmail?: string;
  readonly phone?: string;
  readonly isMock: boolean;
}): Promise<RazorpayPaymentResponse> {
  if (options.isMock) {
    return {
      razorpay_order_id: options.razorpayOrderId,
      razorpay_payment_id: 'mock_payment',
      razorpay_signature: 'mock_signature',
    };
  }

  await ensureRazorpayLoaded();

  if (checkoutOpen) {
    throw new Error('Payment is already in progress. Close the payment window and try again.');
  }

  return new Promise((resolve, reject) => {
    const Razorpay = (window as RazorpayWindow).Razorpay;
    if (!Razorpay) {
      reject(new Error('Razorpay SDK is unavailable'));
      return;
    }

    checkoutOpen = true;
    const finish = (fn: () => void) => {
      checkoutOpen = false;
      fn();
    };

    const rzp = new Razorpay({
      key: options.key,
      amount: options.amount,
      currency: options.currency,
      name: options.merchantName,
      description: 'Monthly meal subscription',
      order_id: options.razorpayOrderId,
      modal_id: uniqueRazorpayModalId('ob_sub'),
      prefill: {
        name: options.customerName?.trim() || undefined,
        email: options.customerEmail?.trim().toLowerCase() || undefined,
        contact: options.phone?.replace(/\D/g, '').slice(-10) || undefined,
      },
      theme: { color: '#ff7a00' },
      handler: (response: RazorpayPaymentResponse) => {
        finish(() => resolve(response));
      },
      modal: {
        ondismiss: () => {
          finish(() => reject(new Error('Payment cancelled')));
        },
      },
    });

    rzp.on('payment.failed', (response) => {
      finish(() => reject(new Error(response.error?.description || 'Payment failed')));
    });

    rzp.open();
  });
}
