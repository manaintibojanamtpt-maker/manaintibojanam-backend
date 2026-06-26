import { IPaymentProvider, PaymentInitializationResponse, PaymentVerificationResponse } from '../IPaymentProvider';

/**
 * Phase 2 placeholder — tenant UPI/QR manual payments.
 * Phase 1: disabled for verification; no auto-success paths.
 */
export class DirectUPIProvider implements IPaymentProvider {
  id = 'upi';
  name = 'Direct UPI';

  async initializePayment(
    amount: number,
    orderId: string,
    _customerData: { name: string; email: string; phone: string; tenantId: string },
    config: any
  ): Promise<PaymentInitializationResponse> {
    const upiId = config?.upiId;
    const merchantName = config?.merchantName || 'Merchant';

    if (!upiId) {
      return { success: false, error: 'Merchant UPI ID not configured.' };
    }

    const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(merchantName)}&am=${amount}&tr=${orderId}&cu=INR`;

    return {
      success: true,
      orderId,
      amount,
      currency: 'INR',
      providerData: {
        upiUrl,
        type: 'intent',
      },
    };
  }

  async verifyPayment(
    _paymentResponse: unknown,
    _orderId: string,
    _config: unknown
  ): Promise<PaymentVerificationResponse> {
    return {
      success: false,
      error: 'Direct UPI verification is not enabled. Owner must verify payment manually (Phase 2).',
    };
  }

  executePayment(
    initializationResponse: PaymentInitializationResponse,
    _onSuccess: (verificationData: unknown) => Promise<void>,
    onError: (error: unknown) => void
  ): void {
    if (initializationResponse.providerData?.upiUrl) {
      window.location.href = initializationResponse.providerData.upiUrl;
      return;
    }
    onError(new Error('Direct UPI is not available yet. Please use Razorpay or Cash on Delivery.'));
  }
}
