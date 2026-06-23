import { getDb } from '../lib/firebase-db';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

export const runEnterpriseMigration = async () => {
  console.log('Starting BhojanOS Enterprise Migration...');
  const db = getDb();
  const tenantsRef = collection(db, 'tenants');
  
  try {
    const snapshot = await getDocs(tenantsRef);
    let updatedCount = 0;
    
    for (const tenantDoc of snapshot.docs) {
      const data = tenantDoc.data();
      const updates: any = {};
      
      // Phase 0 Constraints
      if (!data.storeStatus) updates.storeStatus = 'published';
      if (!data.status) updates.status = 'active';
      
      if (!data.subscription) {
        updates.subscription = {
          planId: 'starter',
          status: 'active',
          startDate: new Date().toISOString(),
          trialUsed: false
        };
      } else if (data.subscription.trialUsed === undefined) {
        updates['subscription.trialUsed'] = false;
      }
      
      if (!data.legal) {
        updates.legal = {
          status: 'pending'
        };
      }
      
      if (!data.fssai) {
        updates.fssai = {
          verificationStatus: 'pending_submission',
          registrationDate: new Date().toISOString()
        };
      }

      if (!data.kyc) {
        updates.kyc = {
          verificationLevel: 0,
          emailVerificationStatus: 'pending',
          mobileVerificationStatus: 'pending'
        };
      } else {
        if (data.kyc.emailVerificationStatus === undefined) {
          updates['kyc.emailVerificationStatus'] = 'pending';
        }
        if (data.kyc.mobileVerificationStatus === undefined) {
          updates['kyc.mobileVerificationStatus'] = 'pending';
        }
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, 'tenants', tenantDoc.id), updates);
        console.log(`Migrated tenant: ${tenantDoc.id}`);
        updatedCount++;
      }
    }
    
    console.log(`Migration Complete. Updated ${updatedCount} tenants.`);
    return { success: true, updatedCount };
  } catch (error) {
    console.error('Migration failed:', error);
    return { success: false, error };
  }
};
