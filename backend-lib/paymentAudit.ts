import { FieldValue, Firestore } from 'firebase-admin/firestore';

export type PaymentVerificationSource =
  | 'razorpay_callback'
  | 'razorpay_webhook'
  | 'system_expiry'
  | 'owner_manual_upi';

export interface PaymentVerificationRecord {
  tenantId: string;
  orderId: string;
  action: 'verified' | 'expired';
  actorRole: 'system' | 'owner';
  actorUserId?: string | null;
  source: PaymentVerificationSource;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  previousPaymentStatus: string;
  newPaymentStatus: string;
  reconciliationSource?: string;
  reconciliationEventId?: string | null;
  draftId?: string;
  upiReference?: string | null;
  notes?: string | null;
}

export const writePaymentVerification = async (
  db: Firestore,
  record: PaymentVerificationRecord
): Promise<string> => {
  const docRef = await db.collection('payment_verifications').add({
    ...record,
    createdAt: FieldValue.serverTimestamp(),
  });
  return docRef.id;
};
