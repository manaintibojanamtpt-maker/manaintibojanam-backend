import { IPaymentProvider, PaymentInitializationResponse, PaymentVerificationResponse } from '../IPaymentProvider';

export class DirectUPIProvider implements IPaymentProvider {
  id = 'upi';
  name = 'Direct UPI';

  async initializePayment(
    amount: number,
    orderId: string,
    customerData: { name: string; email: string; phone: string; tenantId: string },
    config: any
  ): Promise<PaymentInitializationResponse> {
    // Architecture Placeholder
    // In the future, this will generate a UPI intent URL (upi://pay?pa=...&pn=...&am=...)
    // that the frontend can render as a QR code or an intent link.
    const upiId = config?.upiId;
    const merchantName = config?.merchantName || "Merchant";

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
        type: 'intent'
      }
    };
  }

  async verifyPayment(
    paymentResponse: any,
    orderId: string,
    config: any
  ): Promise<PaymentVerificationResponse> {
    return {
      success: true,
      transactionId: paymentResponse?.transactionId || 'pending_upi_verification'
    };
  }

  executePayment(
    initializationResponse: PaymentInitializationResponse,
    onSuccess: (verificationData: any) => Promise<void>,
    onError: (error: any) => void
  ): void {
    // For UPI intent, we might want to automatically redirect the user
    // or just let the UI handle the QR code rendering.
    // For now, we simulate an immediate "success" redirect callback for testing.
    if (initializationResponse.providerData?.upiUrl) {
      window.location.href = initializationResponse.providerData.upiUrl;
      // In a real flow, they leave the app.
      // Assuming they come back, or we mock success.
      setTimeout(() => onSuccess({ transactionId: 'upi_mock_success' }), 5000);
    } else {
      onError(new Error("No UPI intent URL generated"));
    }
  }
}
