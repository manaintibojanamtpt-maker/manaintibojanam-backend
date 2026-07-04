import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader } from '@bhojan/design-system';
import { useAuth } from '@/shared/providers/AuthProvider';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status, isAuthenticated } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '40vh' }}>
        <Loader label="Checking session" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
