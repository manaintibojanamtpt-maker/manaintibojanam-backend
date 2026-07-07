import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { RepositoryCache } from '../RepositoryCache';

describe('RepositoryCache', () => {
  beforeEach(() => {
    // no shared state between tests
  });

  it('returns fresh entries without re-fetching', async () => {
    const cache = new RepositoryCache<string>({ ttlMs: 5_000 });
    let fetches = 0;

    const first = await cache.getOrFetch('a', async () => {
      fetches += 1;
      return 'one';
    });
    const second = await cache.getOrFetch('a', async () => {
      fetches += 1;
      return 'two';
    });

    assert.equal(first, 'one');
    assert.equal(second, 'one');
    assert.equal(fetches, 1);
  });

  it('serves stale value while revalidating in background', async () => {
    const cache = new RepositoryCache<string>({
      ttlMs: 20,
      staleWhileRevalidateMs: 200,
    });

    cache.set('key', 'initial', Date.now() - 50);

    let fetches = 0;
    const result = await cache.getOrFetch('key', async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      fetches += 1;
      return 'fresh-value';
    });

    assert.equal(result, 'initial');

    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(fetches, 1);
    assert.equal(cache.get('key')?.value, 'fresh-value');
  });

  it('coalesces concurrent fetches for the same key', async () => {
    const cache = new RepositoryCache<number>({ ttlMs: 1_000 });
    let fetches = 0;

    const [a, b] = await Promise.all([
      cache.getOrFetch('x', async () => {
        fetches += 1;
        await new Promise((resolve) => setTimeout(resolve, 15));
        return 42;
      }),
      cache.getOrFetch('x', async () => {
        fetches += 1;
        return 99;
      }),
    ]);

    assert.equal(a, 42);
    assert.equal(b, 42);
    assert.equal(fetches, 1);
  });

  it('evicts entries past max stale window', async () => {
    const cache = new RepositoryCache<string>({ ttlMs: 10, staleWhileRevalidateMs: 10, maxStaleMs: 30 });
    await cache.getOrFetch('gone', async () => 'value');
    await new Promise((resolve) => setTimeout(resolve, 35));
    assert.equal(cache.get('gone'), null);
  });
});
