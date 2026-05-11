/**
 * Email Service - Transactional Email Integration
 * 
 * Handles sending order confirmations, payment status updates, delivery notifications, etc.
 * 
 * IMPLEMENTATION NOTES:
 * - Backend should use SendGrid or SMTP provider (not client-side)
 * - Email templates are rendered on backend with order data
 * - This service prepares email data and calls backend API
 * - Update backend environment variables with:
 *   - SENDGRID_API_KEY or SMTP credentials (backend only, never expose client-side)
 *   - SENDER_EMAIL (order@manaintibojanam.com or similar)
 */

interface OrderEmailPayload {
  recipientEmail: string;
  recipientName: string;
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  status: string;
  paymentMethod: string;
  deliveryAddress: string;
  estimatedDeliveryTime?: string;
  subtotal: number;
  gst: number;
  deliveryFee: number;
  courseName?: string; // Restaurant/course name
  courierProvider?: string;
  trackingUrl?: string;
}

interface PaymentEmailPayload {
  recipientEmail: string;
  recipientName: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  paymentMethod: string;
  paymentStatus: string;
  paymentProofUrl?: string;
}

interface FeedbackEmailPayload {
  recipientEmail: string;
  recipientName: string;
  orderId: string;
  orderNumber: string;
  rating: number;
  feedback?: string;
  tags?: string[];
}

class EmailService {
  private backendEmailEndpoint = '/api/emails';

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmationEmail(payload: OrderEmailPayload): Promise<boolean> {
    try {
      const response = await fetch(`${this.backendEmailEndpoint}/order-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'order_confirmation',
          ...payload,
          templateVariables: {
            orderDate: new Date().toLocaleDateString('en-IN'),
            itemsHtml: this.renderItemsHtml(payload.items),
            totalInWords: this.numberToWords(payload.totalAmount),
            supportPhone: '+91-XXXX-XXXX-XX', // Update with actual support number
            brandName: 'Mana Inti Bojanam'
          }
        })
      });

      if (!response.ok) {
        console.error('Order confirmation email failed:', await response.text());
        return false;
      }

      console.log('Order confirmation email sent to:', payload.recipientEmail);
      return true;
    } catch (error) {
      console.error('Error sending order confirmation email:', error);
      return false;
    }
  }

  /**
   * Send order status update email (accepted, preparing, ready, out for delivery, delivered)
   */
  async sendOrderStatusUpdateEmail(
    payload: OrderEmailPayload,
    previousStatus?: string
  ): Promise<boolean> {
    try {
      const statusMessages: Record<string, { subject: string; emoji: string }> = {
        accepted: {
          subject: '✅ Your Order Has Been Accepted',
          emoji: '✅'
        },
        preparing: {
          subject: '👨‍🍳 We\'re Preparing Your Order',
          emoji: '👨‍🍳'
        },
        ready: {
          subject: '📦 Your Order is Ready!',
          emoji: '📦'
        },
        out_for_delivery: {
          subject: '🛵 Your Order is Out for Delivery',
          emoji: '🛵'
        },
        delivered: {
          subject: '✨ Your Order Has Been Delivered',
          emoji: '✨'
        },
        cancelled: {
          subject: '❌ Your Order Has Been Cancelled',
          emoji: '❌'
        }
      };

      const statusInfo = statusMessages[payload.status] || {
        subject: `Order Status Update: ${payload.status}`,
        emoji: '📢'
      };

      const response = await fetch(`${this.backendEmailEndpoint}/order-status-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'order_status_update',
          ...payload,
          templateVariables: {
            statusEmoji: statusInfo.emoji,
            subject: statusInfo.subject,
            estimatedDeliveryTime: payload.estimatedDeliveryTime || 'Soon',
            courierName: payload.courierProvider || 'Our Courier',
            trackingUrl: payload.trackingUrl || '#',
            supportPhone: '+91-XXXX-XXXX-XX',
            brandName: 'Mana Inti Bojanam'
          }
        })
      });

      if (!response.ok) {
        console.error('Order status update email failed:', await response.text());
        return false;
      }

      console.log('Order status update email sent to:', payload.recipientEmail);
      return true;
    } catch (error) {
      console.error('Error sending order status update email:', error);
      return false;
    }
  }

  /**
   * Send payment confirmation email
   */
  async sendPaymentConfirmationEmail(payload: PaymentEmailPayload): Promise<boolean> {
    try {
      const statusMessages: Record<string, string> = {
        verified: '✅ Payment Received and Verified',
        pending: '⏳ Payment Verification Pending',
        failed: '❌ Payment Failed'
      };

      const response = await fetch(`${this.backendEmailEndpoint}/payment-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'payment_confirmation',
          ...payload,
          templateVariables: {
            paymentStatus: statusMessages[payload.paymentStatus] || payload.paymentStatus,
            amountInWords: this.numberToWords(payload.amount),
            transactionId: `TXN-${Date.now()}`,
            paymentDate: new Date().toLocaleDateString('en-IN'),
            supportEmail: 'support@manaintibojanam.com',
            brandName: 'Mana Inti Bojanam'
          }
        })
      });

      if (!response.ok) {
        console.error('Payment confirmation email failed:', await response.text());
        return false;
      }

      console.log('Payment confirmation email sent to:', payload.recipientEmail);
      return true;
    } catch (error) {
      console.error('Error sending payment confirmation email:', error);
      return false;
    }
  }

  /**
   * Send feedback/rating thank you email
   */
  async sendFeedbackThankYouEmail(payload: FeedbackEmailPayload): Promise<boolean> {
    try {
      const starRating = '⭐'.repeat(payload.rating);

      const response = await fetch(`${this.backendEmailEndpoint}/feedback-thankyou`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'feedback_thankyou',
          ...payload,
          templateVariables: {
            starRating,
            ratingText: this.getRatingText(payload.rating),
            hasComments: !!payload.feedback,
            supportEmail: 'feedback@manaintibojanam.com',
            brandName: 'Mana Inti Bojanam'
          }
        })
      });

      if (!response.ok) {
        console.error('Feedback thank you email failed:', await response.text());
        return false;
      }

      console.log('Feedback thank you email sent to:', payload.recipientEmail);
      return true;
    } catch (error) {
      console.error('Error sending feedback thank you email:', error);
      return false;
    }
  }

  /**
   * Send payment failed/retry email
   */
  async sendPaymentFailedEmail(
    recipientEmail: string,
    recipientName: string,
    orderId: string,
    orderNumber: string,
    amount: number
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.backendEmailEndpoint}/payment-failed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'payment_failed',
          recipientEmail,
          recipientName,
          orderId,
          orderNumber,
          amount,
          templateVariables: {
            amountInWords: this.numberToWords(amount),
            retryLink: `/checkout?orderId=${orderId}`,
            supportPhone: '+91-XXXX-XXXX-XX',
            brandName: 'Mana Inti Bojanam'
          }
        })
      });

      if (!response.ok) {
        console.error('Payment failed email failed:', await response.text());
        return false;
      }

      console.log('Payment failed email sent to:', recipientEmail);
      return true;
    } catch (error) {
      console.error('Error sending payment failed email:', error);
      return false;
    }
  }

  /**
   * Send order cancellation email
   */
  async sendOrderCancellationEmail(
    recipientEmail: string,
    recipientName: string,
    orderNumber: string,
    reason: string,
    refundAmount?: number
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.backendEmailEndpoint}/order-cancelled`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'order_cancelled',
          recipientEmail,
          recipientName,
          orderNumber,
          reason,
          refundAmount,
          templateVariables: {
            refundAmountInWords: refundAmount ? this.numberToWords(refundAmount) : 'N/A',
            hasRefund: !!refundAmount,
            supportEmail: 'support@manaintibojanam.com',
            brandName: 'Mana Inti Bojanam'
          }
        })
      });

      if (!response.ok) {
        console.error('Order cancellation email failed:', await response.text());
        return false;
      }

      console.log('Order cancellation email sent to:', recipientEmail);
      return true;
    } catch (error) {
      console.error('Error sending order cancellation email:', error);
      return false;
    }
  }

  /**
   * Render HTML for order items
   */
  private renderItemsHtml(items: OrderEmailPayload['items']): string {
    return items
      .map(
        (item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">
          ${item.name}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">
          ₹${item.unitPrice.toFixed(2)}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">
          ₹${item.lineTotal.toFixed(2)}
        </td>
      </tr>
    `
      )
      .join('');
  }

  /**
   * Convert number to Indian words
   */
  private numberToWords(num: number): string {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = [
      'Ten',
      'Eleven',
      'Twelve',
      'Thirteen',
      'Fourteen',
      'Fifteen',
      'Sixteen',
      'Seventeen',
      'Eighteen',
      'Nineteen'
    ];

    if (num === 0) return 'Zero Rupees';
    if (num < 0) return 'Minus ' + this.numberToWords(-num);

    let words = '';

    // Handle thousands
    if (Math.floor(num / 1000) > 0) {
      words += this.getHundredsWords(Math.floor(num / 1000)) + ' Thousand ';
      num %= 1000;
    }

    // Handle hundreds
    if (Math.floor(num / 100) > 0) {
      words += ones[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }

    // Handle tens and ones
    if (num >= 20) {
      words += tens[Math.floor(num / 10)] + ' ';
      num %= 10;
    } else if (num >= 10) {
      words += teens[num - 10] + ' ';
      num = 0;
    }

    // Handle ones
    if (num > 0) {
      words += ones[num] + ' ';
    }

    return (words.trim() + ' Rupees').trim();
  }

  /**
   * Helper for converting hundreds
   */
  private getHundredsWords(num: number): string {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    let words = '';
    if (Math.floor(num / 100) > 0) {
      words += ones[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }

    if (num >= 20) {
      words += tens[Math.floor(num / 10)] + ' ';
      num %= 10;
    } else if (num >= 10) {
      words += ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'][num - 10] + ' ';
      num = 0;
    }

    if (num > 0) {
      words += ones[num] + ' ';
    }

    return words.trim();
  }

  /**
   * Get rating text based on star count
   */
  private getRatingText(rating: number): string {
    const ratingTexts: Record<number, string> = {
      5: 'Excellent! We loved your feedback!',
      4: 'Great! We appreciate your support!',
      3: 'Good! We\'ll keep improving!',
      2: 'Thanks for your feedback. We\'ll do better!',
      1: 'We\'re sorry. Please help us improve!'
    };
    return ratingTexts[rating] || 'Thank you for your feedback!';
  }
}

export const emailService = new EmailService();
