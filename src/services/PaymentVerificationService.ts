/**
 * Payment Verification Service
 * Handles payment proof validation and fraud detection
 * Prevents "I have paid" fraud by requiring proof submission and admin verification
 */

import { getDb } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, getDoc, Timestamp } from 'firebase/firestore';

export interface PaymentProofSubmission {
  orderId: string;
  proofType: 'upi_screenshot' | 'bank_transfer' | 'card_transaction';
  proofValue: string; // UTR/Reference number or base64 image
  submittedAt: Date;
  submittedBy: string; // userId
  notes?: string;
}

export interface PaymentVerificationResult {
  verified: boolean;
  reason: string;
  flags: string[]; // Fraud flags detected
  verifiedBy?: string; // admin userId
  verifiedAt?: Date;
  razorpayWebhookMatched?: boolean;
  webhookData?: any;
}

export interface RazorpayPaymentLog {
  paymentId: string;
  amount: number;
  currency: string;
  status: 'captured' | 'failed' | 'pending';
  method: string;
  vpa?: string; // UPI identifier
  acquirerData?: any;
  createdAt: Date;
  notes?: any;
}

export class PaymentVerificationService {
  /**
   * Submit payment proof for verification
   * Stores proof but marks order status as PENDING_VERIFICATION
   */
  async submitPaymentProof(submission: PaymentProofSubmission): Promise<void> {
    try {
      // Store proof submission in Firestore
      await addDoc(collection(getDb(), 'paymentProofs'), {
        orderId: submission.orderId,
        proofType: submission.proofType,
        proofValue: submission.proofValue,
        submittedAt: Timestamp.fromDate(submission.submittedAt),
        submittedBy: submission.submittedBy,
        notes: submission.notes || '',
        status: 'pending_review',
        verifiedAt: null,
        verifiedBy: null,
        fraudFlags: [],
      });

      console.log(`Payment proof submitted for order ${submission.orderId}`);
    } catch (error) {
      console.error('Error submitting payment proof:', error);
      throw error;
    }
  }

  /**
   * Verify payment proof - called by admin or automated Razorpay webhook handler
   */
  async verifyPaymentProof(
    orderId: string,
    proofSubmissionId: string,
    razorpayPaymentId?: string,
    verifiedBy?: string
  ): Promise<PaymentVerificationResult> {
    try {
      // Fetch the proof submission
      const proofDocRef = doc(getDb(), 'paymentProofs', proofSubmissionId);
      const proofSnapshot = await getDoc(proofDocRef);

      if (!proofSnapshot.exists()) {
        return {
          verified: false,
          reason: 'Payment proof not found for this submission',
          flags: ['no_proof_submitted'],
        };
      }

      const proofData = proofSnapshot.data() as any;
      if (proofData.orderId !== orderId) {
        return {
          verified: false,
          reason: 'Payment proof does not match order',
          flags: ['proof_order_mismatch'],
        };
      }
      const proofDocId = proofSnapshot.id;

      // Check for fraud indicators
      const fraudFlags: string[] = [];
      const verificationChecks = {
        razorpayWebhookMatched: false,
        webhookData: null,
      };

      // Try to match with Razorpay webhook log if paymentId provided
      if (razorpayPaymentId) {
        const webhookMatch = await this.matchWithRazorpayWebhook(
          razorpayPaymentId,
          proofData,
          orderId
        );

        if (webhookMatch.matched) {
          verificationChecks.razorpayWebhookMatched = true;
          verificationChecks.webhookData = webhookMatch.data;
        } else {
          fraudFlags.push(...webhookMatch.flags);
        }
      }

      // Check for duplicate UPI payments (fraud indicator)
      if (proofData.proofType === 'upi_screenshot') {
        const duplicateCheck = await this.checkForDuplicateUPIPayment(proofData.proofValue);
        if (duplicateCheck.isDuplicate) {
          fraudFlags.push('duplicate_upi_payment');
        }
      }

      // Check payment amount if webhookData available
      if (verificationChecks.webhookData) {
        const orderRef = doc(getDb(), 'orders', orderId);
        // Would fetch order data and compare amounts
        // This is a simplified check
      }

      const verified = fraudFlags.length === 0 && (razorpayPaymentId ? verificationChecks.razorpayWebhookMatched : true);

      // Update proof document with verification result
      await updateDoc(doc(getDb(), 'paymentProofs', proofDocId), {
        status: verified ? 'verified' : 'rejected',
        verifiedAt: Timestamp.now(),
        verifiedBy: verifiedBy || 'system',
        fraudFlags,
      });

      return {
        verified,
        reason: verified ? 'Payment verified successfully' : 'Payment verification failed',
        flags: fraudFlags,
        verifiedBy: verifiedBy || 'system',
        verifiedAt: new Date(),
        razorpayWebhookMatched: verificationChecks.razorpayWebhookMatched,
        webhookData: verificationChecks.webhookData,
      };
    } catch (error) {
      console.error('Error verifying payment proof:', error);
      throw error;
    }
  }

  /**
   * Match payment proof UTR/reference with Razorpay webhook logs
   * This requires your Razorpay webhooks to be logged in a collection
   */
  private async matchWithRazorpayWebhook(
    paymentId: string,
    proofData: any,
    orderId: string
  ): Promise<{ matched: boolean; flags: string[]; data?: any }> {
    try {
      // Query your razorpayWebhooks collection for this payment ID
      const webhooksRef = collection(getDb(), 'razorpayWebhooks');
      const q = query(
        webhooksRef,
        where('event', '==', 'payment.captured'),
        where('payload.payment.id', '==', paymentId)
      );

      const webhookDocs = await getDocs(q);

      if (webhookDocs.empty) {
        return {
          matched: false,
          flags: ['razorpay_payment_not_found'],
        };
      }

      const webhookData = webhookDocs.docs[0].data();
      const payment = webhookData.payload?.payment;

      // Verify timestamp is recent (within 5 minutes of proof submission)
      if (payment.created_at) {
        const paymentTime = new Date(payment.created_at * 1000);
        const proofTime = new Date(proofData.submittedAt);
        const timeDiff = Math.abs(proofTime.getTime() - paymentTime.getTime());

        if (timeDiff > 5 * 60 * 1000) {
          return {
            matched: false,
            flags: ['timestamp_mismatch'],
            data: payment,
          };
        }
      }

      // Verify order notes contain orderId (Razorpay payment notes)
      if (payment.notes && payment.notes.orderId !== orderId) {
        return {
          matched: false,
          flags: ['order_id_mismatch'],
          data: payment,
        };
      }

      return {
        matched: true,
        flags: [],
        data: payment,
      };
    } catch (error) {
      console.error('Error matching with Razorpay webhook:', error);
      return {
        matched: false,
        flags: ['webhook_lookup_failed'],
      };
    }
  }

  /**
   * Check for duplicate UPI payments using the same UPI reference
   * This is a simplified version - in production, you'd parse the UTR from screenshot
   */
  private async checkForDuplicateUPIPayment(utrReference: string): Promise<{ isDuplicate: boolean }> {
    try {
      // Extract UTR from proof (if it's a reference number, not base64)
      // This is simplified - real implementation would use OCR on screenshots
      const proofsRef = collection(getDb(), 'paymentProofs');
      const q = query(
        proofsRef,
        where('proofValue', '==', utrReference),
        where('status', '==', 'verified')
      );

      const duplicateDocs = await getDocs(q);

      return {
        isDuplicate: duplicateDocs.size > 0,
      };
    } catch (error) {
      console.error('Error checking for duplicate UPI payment:', error);
      return {
        isDuplicate: false,
      };
    }
  }

  /**
   * Get payment proof for an order
   */
  async getPaymentProof(orderId: string): Promise<any | null> {
    try {
      const proofsRef = collection(getDb(), 'paymentProofs');
      const q = query(proofsRef, where('orderId', '==', orderId));
      const proofDocs = await getDocs(q);

      if (proofDocs.empty) {
        return null;
      }

      return {
        id: proofDocs.docs[0].id,
        ...proofDocs.docs[0].data(),
      };
    } catch (error) {
      console.error('Error fetching payment proof:', error);
      throw error;
    }
  }

  /**
   * Process Razorpay webhook and auto-verify if conditions met
   * This is called from your webhook handler
   */
  async processRazorpayWebhook(event: any, orderId: string): Promise<void> {
    try {
      // Check if this is a successful payment
      if (event.event === 'payment.captured' && event.payload?.payment?.status === 'captured') {
        const payment = event.payload.payment;

        // Check if there's a matching proof submission
        const proof = await this.getPaymentProof(orderId);

        if (proof) {
          // Auto-verify if Razorpay webhook matches
          await this.verifyPaymentProof(orderId, proof.id, payment.id, 'razorpay_webhook');

          console.log(`Payment auto-verified for order ${orderId} via Razorpay webhook`);
        }
      }
    } catch (error) {
      console.error('Error processing Razorpay webhook:', error);
    }
  }

  /**
   * Get all pending verifications for admin dashboard
   */
  async getPendingVerifications(limit: number = 50): Promise<any[]> {
    try {
      const proofsRef = collection(getDb(), 'paymentProofs');
      const q = query(proofsRef, where('status', '==', 'pending_review'));

      const docs = await getDocs(q);

      return docs.docs.slice(0, limit).map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Error fetching pending verifications:', error);
      throw error;
    }
  }
}

// Export singleton instance for use across app
export const paymentVerificationService = new PaymentVerificationService();
