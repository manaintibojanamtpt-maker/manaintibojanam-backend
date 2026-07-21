export class RazorpayAmountMismatchError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(message: string, code = 'RAZORPAY_AMOUNT_MISMATCH') {
    super(message);
    this.name = 'RazorpayAmountMismatchError';
    this.statusCode = 409;
    this.code = code;
  }
}

export function amountToPaise(amount: number): number {
  return Math.round(amount * 100);
}

export function resolveDraftTotalAmount(draftDocData: Record<string, unknown>): number | null {
  const orderPayload = (draftDocData.orderPayload ?? draftDocData) as Record<string, unknown>;
  const payloadTotal = orderPayload.totalAmount ?? orderPayload.total;
  const rootTotal = draftDocData.totalAmount;

  if (payloadTotal != null && rootTotal != null) {
    const payloadPaise = amountToPaise(Number(payloadTotal));
    const rootPaise = amountToPaise(Number(rootTotal));
    if (payloadPaise !== rootPaise) {
      throw new RazorpayAmountMismatchError(
        'Draft total amount mismatch between order payload and draft root.',
        'DRAFT_AMOUNT_MISMATCH',
      );
    }
  }

  const resolved = payloadTotal ?? rootTotal;
  if (resolved == null) return null;
  const total = Number(resolved);
  if (!Number.isFinite(total) || total <= 0) return null;
  return total;
}

export function resolveCreateRazorpayOrderAmount(draftDocData: Record<string, unknown>): number {
  const draftTotal = resolveDraftTotalAmount(draftDocData);
  if (draftTotal == null) {
    throw Object.assign(new Error('Draft total amount is missing or invalid.'), { statusCode: 400 });
  }

  const finalAmountPaise = amountToPaise(draftTotal);
  const draftTotalPaise = amountToPaise(draftTotal);
  if (finalAmountPaise !== draftTotalPaise) {
    throw new RazorpayAmountMismatchError(
      `Draft amount mismatch: expected ${draftTotalPaise} paise, resolved ${finalAmountPaise} paise.`,
      'DRAFT_AMOUNT_MISMATCH',
    );
  }

  return draftTotal;
}

export function assertDraftRazorpayAmountIntegrity(
  draftDocData: Record<string, unknown>,
  razorpayOrderAmountPaise: number,
  razorpayPaymentAmountPaise?: number,
): number {
  const draftTotal = resolveDraftTotalAmount(draftDocData);
  if (draftTotal == null) {
    throw Object.assign(new Error('Draft total amount is missing or invalid.'), { statusCode: 400 });
  }

  const expectedPaise = amountToPaise(draftTotal);
  if (razorpayOrderAmountPaise !== expectedPaise) {
    throw new RazorpayAmountMismatchError(
      `Razorpay order amount mismatch: expected ${expectedPaise} paise, got ${razorpayOrderAmountPaise} paise.`,
    );
  }

  if (
    razorpayPaymentAmountPaise != null &&
    razorpayPaymentAmountPaise !== expectedPaise
  ) {
    throw new RazorpayAmountMismatchError(
      `Razorpay payment amount mismatch: expected ${expectedPaise} paise, got ${razorpayPaymentAmountPaise} paise.`,
    );
  }

  return draftTotal;
}

export async function fetchAndAssertRazorpayDraftPaymentAmounts(
  razorpayClient: {
    orders: { fetch: (orderId: string) => Promise<{ amount: number }> };
    payments: { fetch: (paymentId: string) => Promise<{ amount: number }> };
  },
  draftDocData: Record<string, unknown>,
  razorpayOrderId: string,
  razorpayPaymentId: string,
): Promise<number> {
  const [order, payment] = await Promise.all([
    razorpayClient.orders.fetch(razorpayOrderId),
    razorpayClient.payments.fetch(razorpayPaymentId),
  ]);

  return assertDraftRazorpayAmountIntegrity(
    draftDocData,
    order.amount,
    payment.amount,
  );
}
