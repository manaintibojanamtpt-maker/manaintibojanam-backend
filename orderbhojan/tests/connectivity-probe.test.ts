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
  });

  it('useOnlineStatus probes connectivity instead of trusting navigator.onLine alone', () => {
    const hook = readFileSync(join(root, 'src/presentation/states/useOnlineStatus.ts'), 'utf8');
    assert.match(hook, /probeSameOriginReachable/);
    assert.doesNotMatch(hook, /navigator\.onLine/);
  });

  it('offline.html retry reconnects to the app shell when reachable', () => {
    const offlineHtml = readFileSync(join(root, 'public/offline.html'), 'utf8');
    assert.match(offlineHtml, /window\.location\.replace/);
    assert.match(offlineHtml, /probeReachable/);
    assert.doesNotMatch(offlineHtml, /onclick="window\.location\.reload\(\)"/);
  });

  it('discovery feed does not hard-block when cached feed data exists', () => {
    const feed = readFileSync(join(root, 'src/features/discovery/ui/DiscoveryHomeFeed.tsx'), 'utf8');
    assert.match(feed, /if \(!online && !feedData\)/);
  });
});
