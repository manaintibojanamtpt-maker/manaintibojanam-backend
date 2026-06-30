/**
 * Injects the correct PWA manifest before React loads.
 * iOS/Android read manifest at "Add to Home Screen" time — blob manifests from React are too late.
 */
(function () {
  var PWA_START_KEY = 'bhojanos_pwa_start';
  var path = window.location.pathname;
  var host = window.location.hostname.toLowerCase();
  var isBhojanHost =
    host === 'localhost' || host === '127.0.0.1' || host.indexOf('bhojanos') !== -1;

  function rememberStartUrl(startUrl) {
    try {
      localStorage.setItem(PWA_START_KEY, startUrl);
    } catch (e) {
      // ignore
    }
  }

  function injectManifest(manifest) {
    var blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
    var url = URL.createObjectURL(blob);
    document.write('<link rel="manifest" href="' + url + '" />');
    window.__PWA_MANIFEST_INJECTED__ = true;
    if (manifest.start_url) rememberStartUrl(manifest.start_url);
  }

  function injectIcons(iconHref, appTitle) {
    document.write('<link rel="icon" href="' + iconHref + '" />');
    document.write('<link rel="apple-touch-icon" href="' + iconHref + '">');
    document.write('<link rel="apple-touch-icon" sizes="152x152" href="' + iconHref + '">');
    document.write('<link rel="apple-touch-icon" sizes="180x180" href="' + iconHref + '">');
    document.write('<link rel="apple-touch-icon" sizes="167x167" href="' + iconHref + '">');
    document.write('<meta name="apple-mobile-web-app-title" content="' + appTitle + '">');
  }

  var storeSlugMatch = path.match(/^\/k\/([^/]+)/);
  if (storeSlugMatch) {
    var slug = storeSlugMatch[1];
    var startPath = '/k/' + slug + '/';
    var displayName = slug.replace(/-/g, ' ').replace(/\b\w/g, function (c) {
      return c.toUpperCase();
    });
    injectManifest({
      name: displayName,
      short_name: displayName.slice(0, 12),
      description: 'Order directly — 0% commission.',
      id: 'com.bhojanos.store.' + slug,
      start_url: startPath,
      scope: startPath,
      display: 'standalone',
      background_color: '#1A0505',
      theme_color: '#1A0505',
      orientation: 'portrait',
      categories: ['food', 'lifestyle'],
      icons: [
        { src: '/icon-v20-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        { src: '/icon-v20-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      ],
    });
    injectIcons('/icon-v20-192.png', displayName.slice(0, 12));
    document.title = displayName + ' | Order Online';
    return;
  }

  if (isBhojanHost && path.indexOf('/owner') === 0) {
    injectManifest({
      name: 'BhojanOS',
      short_name: 'BhojanOS',
      description: 'Direct ordering OS for food businesses',
      id: 'com.bhojanos.owner',
      start_url: '/owner/dashboard',
      scope: '/',
      display: 'standalone',
      background_color: '#1A0505',
      theme_color: '#1A0505',
      orientation: 'portrait',
      categories: ['food', 'business'],
      icons: [
        { src: '/bhojan-os-icon.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        { src: '/bhojan-os-icon.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      ],
    });
    injectIcons('/bhojan-os-icon.png', 'BhojanOS');
    document.title = 'BhojanOS Owner';
    return;
  }

  /** Standalone launch recovery — old installs may still open at marketing /. */
  var isStandalone =
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if (isStandalone && isBhojanHost) {
    var saved = null;
    try {
      saved = localStorage.getItem(PWA_START_KEY);
    } catch (e) {
      saved = null;
    }
    if (
      saved &&
      (path === '/' ||
        path === '/onboard' ||
        path === '/pricing' ||
        path === '/about' ||
        path === '/platform')
    ) {
      window.location.replace(saved);
    }
  }
})();
