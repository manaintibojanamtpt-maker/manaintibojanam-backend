import { parseStorefrontSlug } from './tenantPath';

const PWA_START_KEY = 'bhojanos_pwa_start';

function rememberPwaStartUrl(startUrl: string) {
  try {
    localStorage.setItem(PWA_START_KEY, startUrl);
  } catch {
    // ignore
  }
}

const MANIFEST_LINK_ID = 'bhojanos-tenant-manifest';

export type TenantPwaBranding = {
  name: string;
  slug: string;
  themeColor?: string;
  iconUrl?: string;
};

function upsertMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.name = name;
    document.head.appendChild(el);
  }
  el.content = content;
}

function upsertManifestLink(href: string) {
  let link = document.getElementById(MANIFEST_LINK_ID) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.id = MANIFEST_LINK_ID;
    link.rel = 'manifest';
    document.head.appendChild(link);
  }
  link.href = href;
}

/** Point install / homescreen at this kitchen's storefront path, not bhojanos.com root. */
export function applyTenantPwaManifest(branding: TenantPwaBranding | null) {
  if (typeof document === 'undefined') return;

  const slug = branding?.slug || parseStorefrontSlug(window.location.pathname);
  if (!slug || !branding?.name) {
    document.getElementById(MANIFEST_LINK_ID)?.remove();
    return;
  }

  const startPath = `/k/${slug}/`;
  const manifest = {
    name: branding.name,
    short_name: branding.name.slice(0, 12),
    description: `Order directly from ${branding.name} — 0% commission.`,
    id: `com.bhojanos.store.${slug}`,
    start_url: startPath,
    scope: `/k/${slug}/`,
    display: 'standalone',
    background_color: branding.themeColor || '#1A0505',
    theme_color: branding.themeColor || '#1A0505',
    orientation: 'portrait',
    categories: ['food', 'lifestyle'],
    icons: [
      {
        src: branding.iconUrl || '/bhojan-os-icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: branding.iconUrl || '/bhojan-os-icon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  };

  const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
  const blobUrl = URL.createObjectURL(blob);
  upsertManifestLink(blobUrl);
  upsertMeta('apple-mobile-web-app-title', branding.name);
  document.title = `${branding.name} | Order Online`;
  rememberPwaStartUrl(startPath);

  return () => URL.revokeObjectURL(blobUrl);
}

export function isStorefrontInstallPath(pathname = window.location.pathname): boolean {
  return /^\/k\/[^/]+/.test(pathname);
}

export function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream;
}
