import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { getDb, handleFirestoreError, OperationType } from '../lib/firebase-db';
import { UserProfile } from '../types';

const generateReferralCode = (name: string) => {
  const base = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${base || 'USER'}${random}`;
};

export const saveUserIfNotExists = async (user: {
  uid: string;
  email: string | null;
  displayName: string | null;
  phone: string | null;
}): Promise<UserProfile> => {
  const path = `users/${user.uid}`;

  try {
    const userDoc = await getDoc(doc(getDb(), 'users', user.uid));

    if (!userDoc.exists()) {
      const referralCode = generateReferralCode(user.displayName || 'USER');

      const newUser: UserProfile = {
        userId: user.uid,
        tenantId: 'mana-inti',
        name: user.displayName || '',
        phone: user.phone || '',
        email: user.email || '',
        address: '',
        role: 'user',
        referralCode,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(getDb(), 'users', user.uid), newUser);

      try {
        await setDoc(doc(getDb(), 'referrals', user.uid), {
          userId: user.uid,
          referralCode,
          referredUsers: [],
          totalEarnings: 0,
          discountGiven: 0,
          createdAt: serverTimestamp(),
        });
      } catch (refErr) {
        console.error('Failed to create referral doc:', refErr);
      }

      return newUser;
    }

    const userData = userDoc.data() as UserProfile;
    if (!userData.referralCode) {
      const referralCode = generateReferralCode(userData.name || 'USER');
      await updateDoc(doc(getDb(), 'users', user.uid), { referralCode });

      try {
        await setDoc(doc(getDb(), 'referrals', user.uid), {
          userId: user.uid,
          referralCode,
          referredUsers: [],
          totalEarnings: 0,
          discountGiven: 0,
          createdAt: serverTimestamp(),
        });
      } catch (refErr) {
        console.error('Failed to create referral doc:', refErr);
      }

      return { id: userDoc.id, ...userData, referralCode } as unknown as UserProfile;
    }

    return { id: userDoc.id, ...userData } as unknown as UserProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return { ...user, tenantId: 'mana-inti', role: 'user' } as unknown as UserProfile;
  }
};
