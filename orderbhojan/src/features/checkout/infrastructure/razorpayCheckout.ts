import { getAppConfig } from '@/config';

const RAZORPAY_SCRIPT_ID = 'razorpay-checkout-js';
const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

let loadPromise: Promise<boolean> | null = null;

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
  readonly verified: boolean;
}

function getApiBaseUrl(): string {
  return getAppConfig().marketplaceApiBaseUrl.replace(/\/$/, '');
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

export async function createRazorpayOrder(params: {
  readonly draftId: string;
  readonly userId?: string | null;
}): Promise<CreateRazorpayOrderResult> {
  const response = await fetch(`${getApiBaseUrl()}/api/create-razorpay-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      draftId: params.draftId,
      userId: params.userId ?? undefined,
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

export async function verifyRazorpayPayment(
  payment: RazorpayPaymentResponse,
  draftId: string,
): Promise<VerifyRazorpayPaymentResult> {
  const response = await fetch(`${getApiBaseUrl()}/api/verify-razorpay-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payment,
      draftId,
    }),
  });

  const data = (await response.json()) as {
    success?: boolean;
    verified?: boolean;
    orderId?: string;
    error?: string;
  };

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Payment could not be confirmed');
  }

  return {
    orderId: data.orderId ?? draftId,
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

  return new Promise((resolve, reject) => {
    const Razorpay = (window as RazorpayWindow).Razorpay;
    if (!Razorpay) {
      reject(new Error('Razorpay SDK is unavailable'));
      return;
    }

    const rzp = new Razorpay({
      key: options.key,
      amount: options.amount,
      currency: options.currency,
      name: options.merchantName ?? 'OrderBhojan',
      description: `Order ${options.draftId}`,
      order_id: options.razorpayOrderId,
      prefill: {
        name: options.customerName?.trim() || undefined,
        email: options.customerEmail?.trim().toLowerCase() || undefined,
        contact: options.phone.replace(/\D/g, '').slice(-10),
      },
      theme: { color: '#ff7a00' },
      handler: (response: RazorpayPaymentResponse) => {
        resolve(response);
      },
      modal: {
        ondismiss: () => {
          reject(new Error('Payment window closed'));
        },
      },
    });

    rzp.on('payment.failed', (response) => {
      reject(new Error(response.error?.description || 'Payment failed'));
    });

    rzp.open();
  });
}

export async function runRazorpayCheckoutFlow(params: {
  readonly draftId: string;
  readonly phone: string;
  readonly customerName?: string;
  readonly customerEmail?: string;
  readonly userId?: string | null;
  readonly merchantName?: string;
}): Promise<string> {
  const session = await createRazorpayOrder({
    draftId: params.draftId,
    userId: params.userId,
  });

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
  return verified.orderId;
}
