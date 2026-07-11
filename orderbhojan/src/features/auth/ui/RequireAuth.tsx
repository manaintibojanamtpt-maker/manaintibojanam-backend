import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LoadingSpinner } from '@/shared/ui/ToastHost';
import { useAuth } from '@/shared/providers/AuthProvider';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status, isAuthenticated } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <LoadingSpinner label="Checking session" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
