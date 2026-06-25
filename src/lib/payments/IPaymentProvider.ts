export interface PaymentInitializationResponse {
  success: boolean;
  orderId?: string;
  amount?: number;
  currency?: string;
  providerData?: any; // e.g., razorpay options or UPI intent URL
  error?: string;
}

export interface PaymentVerificationResponse {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export interface IPaymentProvider {
  id: string;
  name: string;

  /**
   * Initializes the payment intent on the provider's side.
   */
  initializePayment(
    amount: number,
    orderId: string,
    customerData: { name: string; email: string; phone: string; tenantId: string },
    config: any // Tenant specific config keys
  ): Promise<PaymentInitializationResponse>;

  /**
   * Verifies the payment response received from the client.
   */
  verifyPayment(
    paymentResponse: any,
    orderId: string,
    config: any
  ): Promise<PaymentVerificationResponse>;

  /**
   * Executes the client-side payment flow (e.g. opening Razorpay modal).
   */
  executePayment(
    initializationResponse: PaymentInitializationResponse,
    onSuccess: (verificationData: any) => Promise<void>,
    onError: (error: any) => void
  ): void;
}
