import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LoadingSpinner } from '@/shared/ui/ToastHost';
import { useAuth } from '@/shared/providers/AuthProvider';

function isGoogleRedirectResumePending(): boolean {
  return typeof sessionStorage !== 'undefined' && sessionStorage.getItem('auth_redirecting') === 'true';
}

/** Mandatory sign-in before home discovery — preserves checkout/location returnTo. */
export function RequireBrowseAuth({ children }: { children: React.ReactNode }) {
  const { status, isAuthenticated } = useAuth();
  const location = useLocation();
  const redirectResumePending = isGoogleRedirectResumePending();

  if (status === 'loading' || redirectResumePending) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <LoadingSpinner label="Checking session" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={`/auth?returnTo=${encodeURIComponent(returnTo)}`}
        replace
        state={{ from: returnTo }}
      />
    );
  }

  return <>{children}</>;
}
