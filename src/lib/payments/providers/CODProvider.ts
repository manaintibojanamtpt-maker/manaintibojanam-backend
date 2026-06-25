import { IPaymentProvider, PaymentInitializationResponse, PaymentVerificationResponse } from '../IPaymentProvider';

export class CODProvider implements IPaymentProvider {
  id = 'cod';
  name = 'Cash on Delivery';

  async initializePayment(
    amount: number,
    orderId: string,
    customerData: { name: string; email: string; phone: string; tenantId: string },
    config: any
  ): Promise<PaymentInitializationResponse> {
    // For COD, initialization is an immediate success.
    return {
      success: true,
      orderId,
      amount,
      currency: 'INR',
      providerData: {
        message: 'Order placed successfully with Cash on Delivery.'
      }
    };
  }

  async verifyPayment(
    paymentResponse: any,
    orderId: string,
    config: any
  ): Promise<PaymentVerificationResponse> {
    // Verification is also a no-op for COD since payment happens on delivery.
    return {
      success: true,
      transactionId: `COD_${orderId}`
    };
  }

  executePayment(
    initializationResponse: PaymentInitializationResponse,
    onSuccess: (verificationData: any) => Promise<void>,
    onError: (error: any) => void
  ): void {
    // COD completes immediately
    onSuccess({ transactionId: `COD_MOCK_SUCCESS` });
  }
}
