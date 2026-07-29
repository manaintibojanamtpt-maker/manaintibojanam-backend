import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { probeSameOriginReachable } from '../src/presentation/states/probeConnectivity.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

describe('OrderBhojan connectivity probe', () => {
  it('defaults to reachable in non-browser environments', async () => {
    assert.equal(await probeSameOriginReachable(), true);
  });

  it('vite PWA serves index.html as navigation fallback instead of offline.html', () => {
    const viteConfig = readFileSync(join(root, 'vite.config.ts'), 'utf8');
    assert.match(viteConfig, /navigateFallback: '\/index\.html'/);
    assert.doesNotMatch(viteConfig, /navigateFallback: '\/offline\.html'/);
    assert.match(viteConfig, /navigateFallbackDenylist:.*offline\\.html/s);
    assert.match(viteConfig, /navigateFallbackDenylist:.*__\\\/auth/s);
    assert.match(viteConfig, /globIgnores:.*offline\.html/s);
  });

  it('useOnlineStatus probes connectivity instead of trusting navigator.onLine alone', () => {
    const hook = readFileSync(join(root, 'src/presentation/states/useOnlineStatus.ts'), 'utf8');
    assert.match(hook, /probeSameOriginReachable/);
    assert.doesNotMatch(hook, /navigator\.onLine/);
  });

  it('probeSameOriginReachable stays optimistic when probes are inconclusive', () => {
    const probe = readFileSync(join(root, 'src/presentation/states/probeConnectivity.ts'), 'utf8');
    assert.match(probe, /Never hard-block the app on a flaky offline signal/);
    assert.match(probe, /return true;/);
    assert.doesNotMatch(probe, /navigator\.onLine/);
  });

  it('index.html purges stale orderbhojan workbox caches before SW update', () => {
    const indexHtml = readFileSync(join(root, 'index.html'), 'utf8');
    assert.match(indexHtml, /orderbhojan-pwa-v8/);
    assert.match(indexHtml, /caches\.keys\(\)/);
    assert.match(indexHtml, /caches\.delete/);
  });

  it('firebase hosting disables CDN cache on /auth OAuth return shell', () => {
    const firebaseJson = readFileSync(join(root, '../firebase.json'), 'utf8');
    assert.match(firebaseJson, /"source": "\/auth"/);
    assert.match(firebaseJson, /"value": "no-cache, must-revalidate"/);
  });

  it('offline.html auto-recovers and resets stale service workers', () => {
    const offlineHtml = readFileSync(join(root, 'public/offline.html'), 'utf8');
    assert.match(offlineHtml, /window\.location\.replace/);
    assert.match(offlineHtml, /probeReachable/);
    assert.match(offlineHtml, /resetStaleServiceWorker/);
    assert.match(offlineHtml, /recoverFromOfflineShell/);
    assert.doesNotMatch(offlineHtml, /onclick="window\.location\.reload\(\)"/);
  });

  it('discovery feed does not hard-block when cached feed data exists', () => {
    const feed = readFileSync(join(root, 'src/features/discovery/ui/DiscoveryHomeFeed.tsx'), 'utf8');
    assert.match(feed, /if \(!online && !feedData\)/);
  });
});
