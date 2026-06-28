import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';

export interface Entitlements {
  maxOrders: number;
  maxUsers: number;
  canPublish: boolean;
  features: {
    marketing: boolean;
    revenueInsights: boolean;
    customerInsights: boolean;
    predictiveSupply: boolean;
    deliveryIntelligence: boolean;
    aiBusinessCoach: boolean;
    apiAccess: boolean;
  };
}

export const useEntitlements = (): Entitlements => {
  const { tenantInfo } = useTenant();
  const { currentUser } = useAuth();
  
  // Default base fallback (Starter)
  const defaultEntitlements: Entitlements = {
    maxOrders: 50,
    maxUsers: 1,
    canPublish: false,
    features: {
      marketing: false,
      revenueInsights: false,
      customerInsights: false,
      predictiveSupply: false,
      deliveryIntelligence: false,
      aiBusinessCoach: false,
      apiAccess: false,
    }
  };

  if (!tenantInfo) return defaultEntitlements;

  let planId = tenantInfo.subscription?.planId || 'starter';
  const fssaiStatus = tenantInfo.fssai?.verificationStatus || 'not_submitted';
  
  // 1. Handle Trial Expiry
  if (tenantInfo.subscription?.trialExpiresAt) {
    const trialExpiry = new Date(tenantInfo.subscription.trialExpiresAt).getTime();
    if (Date.now() > trialExpiry) {
      planId = 'starter'; // Revert to starter if trial expired
    }
  }

  // 2. Email Verification Check
  const isEmailVerified = currentUser?.emailVerified || tenantInfo.kyc?.emailVerificationStatus === 'verified';

  // 3. Check FSSAI Overdue condition
  // Overdue if registered > 30 days ago and not submitted
  let isComplianceOverdue = fssaiStatus === 'compliance_overdue';
  if (tenantInfo.fssai?.registrationDate && fssaiStatus === 'not_submitted') {
    const daysSinceReg = (Date.now() - new Date(tenantInfo.fssai.registrationDate).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceReg > 30) {
      isComplianceOverdue = true;
    }
  }

  // Base Plan Allocations
  let entitlements = { ...defaultEntitlements };

  switch (planId) {
    case 'starter':
      entitlements = {
        maxOrders: 0,
        maxUsers: 1,
        canPublish: false,
        features: {
          ...defaultEntitlements.features,
        }
      };
      break;
    case 'growth':
      entitlements = {
        maxOrders: 500,
        maxUsers: 3,
        canPublish: true,
        features: {
          ...defaultEntitlements.features,
          marketing: true,
          customerInsights: true,
          aiBusinessCoach: true,
        }
      };
      break;
    case 'pro':
      entitlements = {
        maxOrders: Infinity,
        maxUsers: Infinity,
        canPublish: true,
        features: {
          marketing: true,
          revenueInsights: true,
          customerInsights: true,
          predictiveSupply: true,
          deliveryIntelligence: true,
          aiBusinessCoach: true,
          apiAccess: false,
        }
      };
      break;
    case 'enterprise':
      entitlements = {
        maxOrders: Infinity,
        maxUsers: Infinity,
        canPublish: true,
        features: {
          marketing: true,
          revenueInsights: true,
          customerInsights: true,
          predictiveSupply: true,
          deliveryIntelligence: true,
          aiBusinessCoach: true,
          apiAccess: true,
        }
      };
      break;
  }

  // Apply Compliance Penalties & Email Verification Locks
  if (isComplianceOverdue) {
    entitlements.canPublish = false;
    entitlements.features.marketing = false;
    entitlements.features.predictiveSupply = false;
    entitlements.features.deliveryIntelligence = false;
  }

  if (!isEmailVerified) {
    entitlements.canPublish = false;
    entitlements.features.marketing = false;
    entitlements.features.predictiveSupply = false;
    entitlements.features.deliveryIntelligence = false;
    entitlements.features.revenueInsights = false;
    entitlements.features.customerInsights = false;
    entitlements.features.aiBusinessCoach = false;
  }

  // 4. Founder Bypass (Master Store)
  if (currentUser?.email === 'manaintibojanamtpt@gmail.com') {
    return {
      maxOrders: Infinity,
      maxUsers: Infinity,
      canPublish: true,
      features: {
        marketing: true,
        revenueInsights: true,
        customerInsights: true,
        predictiveSupply: true,
        deliveryIntelligence: true,
        aiBusinessCoach: true,
        apiAccess: true,
      }
    };
  }

  return entitlements;
};
