import type { Express, Request, Response } from 'express';
import type { Firestore, FieldValue } from 'firebase-admin/firestore';

const REFERRAL_REWARD_INR = 100;

type VerifyTokenFn = (req: Request, res: Response, next: () => void) => void;

export function registerMarketplaceReferralRoutes(
  app: Express,
  db: Firestore,
  fieldValue: typeof FieldValue,
  verifyFirebaseToken: VerifyTokenFn,
): void {
  app.post('/api/marketplace/referrals/apply', verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const referralCode =
        typeof req.body?.referralCode === 'string' ? req.body.referralCode.trim().toUpperCase() : '';
      const refereeUserId = req.user.uid;

      if (!referralCode) {
        return res.status(400).json({ ok: false, error: { code: 'INVALID', message: 'referralCode is required' } });
      }

      const snapshot = await db
        .collection('referrals')
        .where('referralCode', '==', referralCode)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Invalid referral code' } });
      }

      const referralDoc = snapshot.docs[0];
      const referral = referralDoc.data() as Record<string, unknown>;
      const referrerUserId = String(referral.userId ?? referralDoc.id);

      if (referrerUserId === refereeUserId) {
        return res.status(400).json({ ok: false, error: { code: 'SELF_REFERRAL', message: 'Cannot use your own referral code' } });
      }

      const referredUsers = Array.isArray(referral.referredUsers) ? referral.referredUsers : [];
      if (referredUsers.includes(refereeUserId)) {
        return res.json({
          ok: true,
          value: { applied: false, alreadyUsed: true, discountAmount: REFERRAL_REWARD_INR },
        });
      }

      const subSnap = await db.collection('subscriptions').where('userId', '==', referrerUserId).limit(1).get();
      const subscriptionRef = subSnap.empty ? null : subSnap.docs[0].ref;

      await db.runTransaction(async (transaction) => {
        const referralRef = db.collection('referrals').doc(referralDoc.id);
        const freshReferral = await transaction.get(referralRef);
        if (!freshReferral.exists) throw new Error('Referral no longer available');

        transaction.update(referralRef, {
          referredUsers: fieldValue.arrayUnion(refereeUserId),
          totalEarnings: fieldValue.increment(REFERRAL_REWARD_INR),
          discountGiven: fieldValue.increment(REFERRAL_REWARD_INR),
          updatedAt: fieldValue.serverTimestamp(),
        });

        if (subscriptionRef) {
          transaction.update(subscriptionRef, {
            pendingDiscount: fieldValue.increment(REFERRAL_REWARD_INR),
            updatedAt: fieldValue.serverTimestamp(),
          });
        }
      });

      res.json({
        ok: true,
        value: {
          applied: true,
          referralCode,
          discountAmount: REFERRAL_REWARD_INR,
          referrerUserId,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to apply referral code';
      res.status(500).json({ ok: false, error: { code: 'INTERNAL', message, retryable: true } });
    }
  });
}
