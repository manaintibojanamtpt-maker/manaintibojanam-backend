import React from 'react';
import { Navigate } from 'react-router-dom';
import { useEntitlements } from '../../hooks/useEntitlements';
import { Entitlements } from '../../hooks/useEntitlements';

interface EntitlementGateProps {
  feature: keyof Entitlements['features'];
  children: React.ReactNode;
}

export const EntitlementGate: React.FC<EntitlementGateProps> = ({ feature, children }) => {
  const entitlements = useEntitlements();

  if (!entitlements.features[feature]) {
    // If not entitled, redirect back to dashboard or show a paywall
    return <Navigate to="/owner/dashboard" replace />;
  }

  return <>{children}</>;
};
