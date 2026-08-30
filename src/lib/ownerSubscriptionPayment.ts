import { auth } from '../firebase';
import { EnvironmentConfig } from '../config/environment';
import { ensureRazorpayLoaded } from '../utils/loadRazorpay';
import type { PaidPlanId } from '../config/pricing';
import { getPlanById } from '../config/pricing';
import { warmOwnerApi } from './ownerProvisioning';

function resolveApiBase(): string {
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'bhojanos.com' || window.location.hostname === 'www.bhojanos.com')
  ) {
    return window.location.origin;
  }
  return EnvironmentConfig.getApiUrl();
}

async function ownerAuthHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be signed in to continue.');
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

/** Bounded fetch with AbortController timeout for the Render-hosted API (cold starts can be slow). */
async function fetchWithTimeout(resource: string, init: RequestInit = {}, timeoutMs = 45_000): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(resource, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

export async function runOwnerSubscriptionPayment(params: {
  tenantId: string;
  planId: PaidPlanId;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}): Promise<void> {
  const plan = getPlanById(params.planId);
  if (!plan || plan.price <= 0) {
    throw new Error('Invalid plan for payment.');
  }

  const apiBase = resolveApiBase();
  const headers = await ownerAuthHeaders();

  // Wake up the Render API (cold starts can take 30-60s) before creating the payment session,
  // so the owner never sees an endless "Updating…" spinner or a raw network error.
  void warmOwnerApi(20_000).catch(() => undefined);

  let checkoutRes: Response;
  let checkoutData: any;
  try {
    checkoutRes = await fetchWithTimeout(`${apiBase}/api/owner/subscription/checkout`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ tenantId: params.tenantId, planId: params.planId }),
    });
    checkoutData = await checkoutRes.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Payment session is taking longer than usual. Please try again — your card has not been charged.');
    }
    throw new Error('Could not reach the payment server. Check your connection and try again.');
  }

  if (!checkoutRes.ok || (!checkoutData.subscription?.id && !checkoutData.order?.id)) {
    // Retry once in case Render was still cold-starting on the first attempt.
    if (checkoutRes.status === 500 || checkoutRes.status === 502 || checkoutRes.status === 504 || checkoutRes.status === 0) {
      try {
        checkoutRes = await fetchWithTimeout(`${apiBase}/api/owner/subscription/checkout`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ tenantId: params.tenantId, planId: params.planId }),
        });
        checkoutData = await checkoutRes.json();
      } catch {
        throw new Error('Could not reach the payment server. Check your connection and try again.');
      }
    }
    if (!checkoutRes.ok || (!checkoutData.subscription?.id && !checkoutData.order?.id)) {
      throw new Error(checkoutData?.error || 'Failed to create payment session');
    }
  }

  if (checkoutData.isMock) {
    const confirmRes = await fetch(`${apiBase}/api/owner/subscription/confirm-payment`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        tenantId: params.tenantId,
        planId: params.planId,
        razorpay_subscription_id: checkoutData.subscription?.id || checkoutData.order?.id,
        razorpay_payment_id: `mock_payment_${Date.now()}`,
        razorpay_signature: 'mock_signature',
        isMock: true,
      }),
    });
    const confirmData = await confirmRes.json();
    if (!confirmRes.ok || !confirmData.success) {
      throw new Error(confirmData.error || 'Failed to activate plan after mock payment');
    }
    return;
  }

  if (!checkoutData.key) {
    throw new Error('Payment gateway is not configured');
  }

  await ensureRazorpayLoaded();

  const paymentResponse = await new Promise<{
    razorpay_subscription_id?: string;
    razorpay_order_id?: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }>((resolve, reject) => {
    const Razorpay = (window as any).Razorpay;
    if (!Razorpay) {
      reject(new Error('Razorpay SDK is unavailable'));
      return;
    }

    const options: any = {
      key: checkoutData.key,
      name: 'BhojanOS',
      description: `${plan.name} plan — ${plan.priceLabel}${plan.period}`,
      prefill: {
        name: params.customerName || '',
        email: (params.customerEmail || '').toLowerCase(),
        contact: (params.customerPhone || '').replace(/\D/g, '').slice(-10),
      },
      theme: { color: '#E65100' },
      handler: (response: any) => resolve(response),
      modal: {
        ondismiss: () => reject(new Error('Payment cancelled')),
      },
    };

    if (checkoutData.subscription?.id) {
      options.subscription_id = checkoutData.subscription.id;
    } else if (checkoutData.order?.id) {
      options.order_id = checkoutData.order.id;
      options.amount = checkoutData.order.amount;
      options.currency = checkoutData.order.currency || 'INR';
    } else {
      reject(new Error('Invalid checkout session response'));
      return;
    }

    const rzp = new Razorpay(options);
    rzp.open();
  });

  const confirmRes = await fetch(`${apiBase}/api/owner/subscription/confirm-payment`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      tenantId: params.tenantId,
      planId: params.planId,
      ...paymentResponse,
    }),
  });
  const confirmData = await confirmRes.json();
  if (!confirmRes.ok || !confirmData.success) {
    throw new Error(confirmData.error || 'Payment verification failed');
  }
}
