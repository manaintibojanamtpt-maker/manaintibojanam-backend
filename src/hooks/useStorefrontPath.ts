import { useTenant } from '../context/TenantContext';
import { EnvironmentConfig } from '../config/environment';

export function resolvePostLoginRedirect(
  pathname: string,
  explicitRedirect: string | null,
  tenantSlug?: string,
): string {
  if (explicitRedirect && explicitRedirect.startsWith('/')) {
    return explicitRedirect;
  }

  if (tenantSlug) {
    return `/k/${tenantSlug}`;
  }

  const tenantMatch = pathname.match(/^\/k\/([^/]+)/);
  if (tenantMatch) {
    return `/k/${tenantMatch[1]}`;
  }

  if (EnvironmentConfig.isBhojanOSRoot()) {
    return '/account';
  }

  return '/';
}

export function useStorefrontPath() {
  const { tenantSlug } = useTenant();
  const basePath = tenantSlug ? `/k/${tenantSlug}` : '';

  const to = (path: string) => {
    if (!path.startsWith('/')) return `${basePath}/${path}`;
    return basePath ? `${basePath}${path}` : path;
  };

  const loginPath = (redirectAfter?: string) => {
    const target = redirectAfter ?? (basePath || '/account');
    return `${to('/login')}?redirect=${encodeURIComponent(target)}`;
  };

  return { basePath, to, loginPath };
}
