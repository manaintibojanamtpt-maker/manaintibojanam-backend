import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { getDb } from '../lib/firebase-db';

const POINTS_PER_100_SPENT = 10;

export const calculatePointsEarned = (orderTotal: number): number => {
  return Math.floor(orderTotal / 100) * POINTS_PER_100_SPENT;
};

export const determineRewardTier = (lifetimePoints: number): string => {
  if (lifetimePoints >= 5000) return 'Platinum';
  if (lifetimePoints >= 2000) return 'Gold';
  if (lifetimePoints >= 500) return 'Silver';
  return 'Bronze';
};

export const processOrderLoyalty = async (userId: string, orderTotal: number) => {
  try {
    const db = getDb();
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      const pointsEarned = calculatePointsEarned(orderTotal);
      
      const newLifetimePoints = (data.lifetimePointsEarned || 0) + pointsEarned;
      const newTier = determineRewardTier(newLifetimePoints);

      await updateDoc(userRef, {
        bhojanPoints: increment(pointsEarned),
        lifetimePointsEarned: increment(pointsEarned),
        lifetimeSpend: increment(orderTotal),
        rewardTier: newTier,
        lastPointsActivityAt: new Date()
      });
      
      return { pointsEarned, newTier };
    }
  } catch (error) {
    console.error("Failed to process loyalty points", error);
  }
  return { pointsEarned: 0, newTier: 'Bronze' };
};
