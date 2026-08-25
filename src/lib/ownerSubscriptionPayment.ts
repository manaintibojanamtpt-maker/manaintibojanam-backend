import { auth } from '../firebase';
import { EnvironmentConfig } from '../config/environment';
import { ensureRazorpayLoaded } from '../utils/loadRazorpay';
import type { PaidPlanId } from '../config/pricing';
import { getPlanById } from '../config/pricing';

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

  const checkoutRes = await fetch(`${apiBase}/api/owner/subscription/checkout`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ tenantId: params.tenantId, planId: params.planId }),
  });
  const checkoutData = await checkoutRes.json();

  if (!checkoutRes.ok || (!checkoutData.subscription?.id && !checkoutData.order?.id)) {
    throw new Error(checkoutData.error || 'Failed to create payment session');
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
