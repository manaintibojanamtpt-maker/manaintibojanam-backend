import React from 'react';
import { LoadingSpinner } from '@/shared/ui/ToastHost';
import { useAuth } from '@/shared/providers/AuthProvider';

function isGoogleRedirectResumePending(): boolean {
  return typeof sessionStorage !== 'undefined' && sessionStorage.getItem('auth_redirecting') === 'true';
}

/**
 * Waits for auth session resolution, then allows home discovery for guests and signed-in users.
 * Checkout / orders / favorites still use RequireAuth — browsing does not require sign-in.
 */
export function RequireBrowseAuth({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const redirectResumePending = isGoogleRedirectResumePending();

  if (status === 'loading' || redirectResumePending) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <LoadingSpinner label="Checking session" />
      </div>
    );
  }

  return <>{children}</>;
}
