import React from 'react';
import { FeaturePaywall } from './FeaturePaywall';
import { useEntitlements } from '../../hooks/useEntitlements';
import { Entitlements } from '../../hooks/useEntitlements';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { hasFounderTenantEntitlements } from '../../config/founder';

interface EntitlementGateProps {
  feature: keyof Entitlements['features'];
  children: React.ReactNode;
}

export const EntitlementGate: React.FC<EntitlementGateProps> = ({ feature, children }) => {
  const entitlements = useEntitlements();
  const { currentUser } = useAuth();
  const { tenantInfo } = useTenant();

  if (hasFounderTenantEntitlements(currentUser?.email, tenantInfo?.id, tenantInfo?.slug)) {
    return <>{children}</>;
  }

  if (!entitlements.features[feature]) {
    // If not entitled, show the feature paywall instead of redirecting
    return <FeaturePaywall featureKey={feature} />;
  }

  return <>{children}</>;
};
