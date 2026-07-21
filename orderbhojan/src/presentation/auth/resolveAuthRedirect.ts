import type { Location } from 'react-router-dom';
import { readPersistedAuthReturnTo } from '@/features/auth/domain/authReturnTo';

/** Safe post-auth destination from `?returnTo=`, sessionStorage, or router state. */
export function resolveAuthRedirect(location: Pick<Location, 'search' | 'state'>): string {
  const params = new URLSearchParams(location.search);
  const returnTo = params.get('returnTo')?.trim();
  if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
    return returnTo;
  }

  const stored = readPersistedAuthReturnTo();
  if (stored) {
    return stored;
  }

  const fromState = (location.state as { from?: string } | null)?.from?.trim();
  if (fromState && fromState.startsWith('/') && !fromState.startsWith('//')) {
    return fromState;
  }

  return '/';
}
