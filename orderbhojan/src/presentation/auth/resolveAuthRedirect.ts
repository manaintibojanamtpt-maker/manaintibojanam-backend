import type { Location } from 'react-router-dom';

/** Safe post-auth destination from `?returnTo=` or router state. */
export function resolveAuthRedirect(location: Pick<Location, 'search' | 'state'>): string {
  const params = new URLSearchParams(location.search);
  const returnTo = params.get('returnTo')?.trim();
  if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
    return returnTo;
  }
  return (location.state as { from?: string } | null)?.from ?? '/';
}
