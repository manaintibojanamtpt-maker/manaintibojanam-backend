/** Shared marketing route detection for client + server. */

export const MARKETING_PATHS = new Set([
  '/',
  '/onboard',
  '/pricing',
  '/about',
  '/platform',
  '/security',
  '/contact',
  '/blog',
]);

export function isBhojanMarketingHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.includes('bhojanos') ||
    host.includes('firebaseapp.com')
  );
}

export function isMarketingPathname(pathname: string): boolean {
  const path = pathname.split('?')[0].replace(/\/$/, '') || '/';
  return MARKETING_PATHS.has(path);
}

export function isMarketingRequest(pathname: string, hostname: string): boolean {
  return isBhojanMarketingHost(hostname) && isMarketingPathname(pathname);
}
