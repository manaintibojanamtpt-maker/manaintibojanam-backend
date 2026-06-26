import { IPaymentProvider, PaymentInitializationResponse, PaymentVerificationResponse } from '../IPaymentProvider';
import { EnvironmentConfig } from '../../../config/environment';
import { ensureRazorpayLoaded } from '../../../utils/loadRazorpay';

export class RazorpayProvider implements IPaymentProvider {
  id = 'razorpay';
  name = 'Razorpay';

  async initializePayment(
    amount: number,
    orderId: string,
    customerData: { name: string; email: string; phone: string; tenantId: string },
    config: any
  ): Promise<PaymentInitializationResponse> {
    try {
      const API_BASE_URL = EnvironmentConfig.getApiUrl();
      const res = await fetch(`${API_BASE_URL}/api/create-razorpay-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // convert to paise
          tenantId: customerData.tenantId,
          orderId
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to initialize Razorpay order');
      }

      // We return the Razorpay specific options to the client inside providerData
      // The client will use this to open the Razorpay modal
      const options = {
        key: config?.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: data.order.amount,
        currency: data.order.currency,
        name: config?.merchantName || "Checkout",
        description: `Order ${orderId}`,
        order_id: data.order.id,
        prefill: {
          name: customerData.name,
          email: customerData.email,
          contact: customerData.phone
        },
        theme: {
          color: "#f97316" // orange-500
        }
      };

      return {
        success: true,
        orderId: data.order.id,
        amount: data.order.amount,
        currency: data.order.currency,
        providerData: options
      };
    } catch (err: any) {
      console.error('Razorpay Init Error:', err);
      return { success: false, error: err.message || 'Payment initialization failed' };
    }
  }

  async verifyPayment(
    paymentResponse: any,
    orderId: string,
    config: any
  ): Promise<PaymentVerificationResponse> {
    try {
      const API_BASE_URL = EnvironmentConfig.getApiUrl();
      const res = await fetch(`${API_BASE_URL}/api/verify-razorpay-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: paymentResponse.razorpay_order_id,
          razorpay_payment_id: paymentResponse.razorpay_payment_id,
          razorpay_signature: paymentResponse.razorpay_signature,
          tenantId: config?.tenantId,
          orderId
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Payment could not be confirmed');
      }

      return {
        success: true,
        transactionId: paymentResponse.razorpay_payment_id
      };
    } catch (err: any) {
      console.error('Razorpay Verify Error:', err);
      return { success: false, error: err.message || 'Payment could not be confirmed' };
    }
  }

  async executePayment(
    initializationResponse: PaymentInitializationResponse,
    onSuccess: (verificationData: any) => Promise<void>,
    onError: (error: any) => void
  ): Promise<void> {
    try {
      await ensureRazorpayLoaded();

      const options = {
        ...initializationResponse.providerData,
        handler: async function(response: any) {
          await onSuccess(response);
        },
        modal: {
          ondismiss: function() {
            onError(new Error("Payment window closed"));
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        onError(new Error(response.error.description || "Payment failed"));
      });
      rzp.open();
    } catch (err: any) {
      onError(err);
    }
  }
}
