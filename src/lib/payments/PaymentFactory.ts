import { IPaymentProvider } from './IPaymentProvider';
import { RazorpayProvider } from './providers/RazorpayProvider';
import { DirectUPIProvider } from './providers/DirectUPIProvider';
import { CODProvider } from './providers/CODProvider';

export class PaymentFactory {
  static getProvider(providerId: string): IPaymentProvider {
    switch (providerId.toLowerCase()) {
      case 'razorpay':
        return new RazorpayProvider();
      case 'upi':
        return new DirectUPIProvider();
      case 'cod':
        return new CODProvider();
      case 'phonepe':
      case 'stripe':
      case 'cashfree':
      case 'paypal':
        throw new Error(`Provider ${providerId} architecture placeholder reached. Not yet implemented.`);
      default:
        // Default to Razorpay for backward compatibility if undefined
        console.warn(`Unknown payment provider: ${providerId}, defaulting to razorpay`);
        return new RazorpayProvider();
    }
  }
}
