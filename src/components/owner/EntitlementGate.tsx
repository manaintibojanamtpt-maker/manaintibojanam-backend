import React from 'react';
import { Navigate } from 'react-router-dom';
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
    // If not entitled, redirect back to dashboard or show a paywall
    return <Navigate to="/owner/dashboard" replace />;
  }

  return <>{children}</>;
};
