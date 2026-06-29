import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getDb, handleFirestoreError, OperationType } from './firebase-db';
import { UserProfile } from '../types';

const generateReferralCode = (name: string) => {
  const base = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${base || 'USER'}${random}`;
};

/** Lightweight user bootstrap — no api.ts / checkout chunk dependency. */
export async function saveUserIfNotExists(user: {
  uid: string;
  email: string | null;
  displayName: string | null;
  phone: string | null;
}): Promise<UserProfile> {
  const path = `users/${user.uid}`;
  try {
    const userDoc = await getDoc(doc(getDb(), 'users', user.uid));
    if (!userDoc.exists()) {
      const referralCode = generateReferralCode(user.displayName || 'USER');
      const userRef = doc(getDb(), 'users', user.uid);

      await setDoc(
        userRef,
        {
          userId: user.uid,
          name: user.displayName || '',
          phone: user.phone || '',
          email: user.email || '',
          address: '',
          referralCode,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      const createdSnap = await getDoc(userRef);
      const createdData = createdSnap.data() || {};
      if (!createdData.role) {
        await updateDoc(userRef, { role: 'user' });
      }

      return {
        userId: user.uid,
        name: user.displayName || '',
        phone: user.phone || '',
        email: user.email || '',
        address: '',
        role: (createdData.role as UserProfile['role']) || 'user',
        referralCode,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } as UserProfile;
    }

    const userData = userDoc.data() as UserProfile;
    if (!userData.referralCode) {
      const referralCode = generateReferralCode(userData.name || 'USER');
      await updateDoc(doc(getDb(), 'users', user.uid), { referralCode });
      return { id: userDoc.id, ...userData, referralCode } as unknown as UserProfile;
    }
    return { id: userDoc.id, ...userData } as unknown as UserProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}
