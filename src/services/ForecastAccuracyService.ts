import { collection, query, where, getDocs, Timestamp, doc, setDoc, getDoc } from 'firebase/firestore';
import { getDb } from '../lib/firebase-db';
import { ForecastAccuracy, Forecast } from '../types';

/**
 * Compares predicted vs actuals to track accuracy and refine future forecasts.
 */
export const calculateDailyAccuracy = async (tenantId: string, dateStr: string): Promise<ForecastAccuracy | null> => {
  if (!tenantId || !dateStr) return null;
  
  try {
    const db = getDb();
    
    // 1. Fetch the forecast made for this date
    const forecastRef = doc(db, 'tenant_forecasts', `${tenantId}_daily_${dateStr}`);
    const forecastSnap = await getDoc(forecastRef);
    
    if (!forecastSnap.exists()) return null; // No forecast was made
    
    const forecast = forecastSnap.data() as Forecast;
    
    // 2. Fetch actual orders for that date
    const targetDateObj = new Date(dateStr);
    const nextDay = new Date(targetDateObj);
    nextDay.setDate(nextDay.getDate() + 1);
    
    const ordersQuery = query(
      collection(db, 'orders'),
      where('tenantId', '==', tenantId),
      where('status', '==', 'completed'),
      where('createdAt', '>=', Timestamp.fromDate(targetDateObj)),
      where('createdAt', '<', Timestamp.fromDate(nextDay))
    );
    
    const ordersSnap = await getDocs(ordersQuery);
    const actualOrders = ordersSnap.docs.length;
    
    // 3. Calculate Variance & Accuracy
    // Formula: Error = |Actual - Expected| / Expected
    // Accuracy = 100% - Error%
    const expected = forecast.expectedOrders || 1; // Prevent div/0
    const errorAbs = Math.abs(actualOrders - expected);
    const variancePercent = Math.round(((actualOrders - expected) / expected) * 100);
    const errorPercent = Math.round((errorAbs / expected) * 100);
    
    let accuracyPercent = 100 - errorPercent;
    if (accuracyPercent < 0) accuracyPercent = 0; // Floor at 0%
    
    const accuracyRecord: ForecastAccuracy = {
      date: dateStr,
      accuracyPercent,
      variancePercent, // negative means underperformed, positive means overperformed
      predictionError: errorAbs
    };
    
    // 4. Save accuracy record
    const accRef = doc(db, 'tenant_forecast_accuracy', `${tenantId}_${dateStr}`);
    await setDoc(accRef, accuracyRecord, { merge: true });
    
    // Update the forecast with actuals
    await setDoc(forecastRef, { actualOrders }, { merge: true });
    
    return accuracyRecord;
  } catch (error) {
    console.error('Error calculating forecast accuracy:', error);
    return null;
  }
};

/**
 * Returns a learning dampener multiplier based on historical accuracy.
 * e.g., if we consistently overpredict by 10%, returns 0.9.
 */
export const getLearningDampener = async (tenantId: string): Promise<number> => {
  try {
    const db = getDb();
    
    // Fetch last 7 days of accuracy
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 7);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];
    
    const q = query(
      collection(db, 'tenant_forecast_accuracy'),
      where('date', '>=', dateStr) // simplified query for ID structure
    );
    
    const snap = await getDocs(q);
    if (snap.empty) return 1.0; // No adjustment if no history
    
    const records = snap.docs.map(d => d.data() as ForecastAccuracy);
    
    // Average variance
    const totalVariance = records.reduce((sum, r) => sum + r.variancePercent, 0);
    const avgVariance = totalVariance / records.length;
    
    // If avgVariance is -10% (actuals are 10% lower than expected), 
    // dampener should be 0.9 to lower future expectations.
    // Cap dampener adjustments to +/- 15% to prevent wild swings.
    let dampener = 1 + (avgVariance / 100);
    if (dampener > 1.15) dampener = 1.15;
    if (dampener < 0.85) dampener = 0.85;
    
    return Number(dampener.toFixed(2));
  } catch (error) {
    return 1.0;
  }
};
