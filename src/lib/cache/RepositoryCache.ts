export interface RepositoryCacheOptions {
  /** Fresh TTL — entries younger than this are served without revalidation. */
  ttlMs: number;
  /** Stale window — expired entries may still be returned while a refresh runs. */
  staleWhileRevalidateMs?: number;
  /** Hard cap — entries older than ttl + stale are evicted. */
  maxStaleMs?: number;
}

interface CacheEntry<T> {
  value: T;
  fetchedAt: number;
}

export interface CacheLookupResult<T> {
  value: T;
  fresh: boolean;
  stale: boolean;
}

type InflightMap = Map<string, Promise<unknown>>;

/**
 * In-memory repository cache with TTL and stale-while-revalidate semantics.
 * Concurrent misses for the same key are coalesced into a single fetch.
 */
export class RepositoryCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly inflight: InflightMap = new Map();
  private readonly ttlMs: number;
  private readonly staleWhileRevalidateMs: number;
  private readonly maxStaleMs: number;

  constructor(options: RepositoryCacheOptions) {
    this.ttlMs = options.ttlMs;
    this.staleWhileRevalidateMs = options.staleWhileRevalidateMs ?? options.ttlMs;
    this.maxStaleMs = options.maxStaleMs ?? this.ttlMs + this.staleWhileRevalidateMs;
  }

  get(key: string): CacheLookupResult<T> | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.fetchedAt;
    if (age > this.maxStaleMs) {
      this.store.delete(key);
      return null;
    }

    return {
      value: entry.value,
      fresh: age <= this.ttlMs,
      stale: age > this.ttlMs,
    };
  }

  set(key: string, value: T, fetchedAt = Date.now()): void {
    this.store.set(key, { value, fetchedAt });
  }

  delete(key: string): void {
    this.store.delete(key);
    this.inflight.delete(key);
  }

  clear(): void {
    this.store.clear();
    this.inflight.clear();
  }

  /**
   * Returns cached value when fresh or stale (SWR). Triggers background refresh for stale entries.
   * On miss, awaits fetchFn and stores the result.
   */
  async getOrFetch(
    key: string,
    fetchFn: () => Promise<T>,
    onRevalidate?: (value: T) => void,
  ): Promise<T> {
    const cached = this.get(key);

    if (cached?.fresh) {
      return cached.value;
    }

    if (cached?.stale) {
      void this.revalidate(key, fetchFn, onRevalidate).catch(() => {
        // Keep serving stale value on background refresh failure.
      });
      return cached.value;
    }

    return this.fetchAndStore(key, fetchFn, onRevalidate);
  }

  private async revalidate(
    key: string,
    fetchFn: () => Promise<T>,
    onRevalidate?: (value: T) => void,
  ): Promise<T> {
    try {
      const value = await this.fetchAndStore(key, fetchFn, onRevalidate);
      onRevalidate?.(value);
      return value;
    } catch {
      const existing = this.get(key);
      if (existing) return existing.value;
      throw new Error(`RepositoryCache revalidate failed for key: ${key}`);
    }
  }

  private fetchAndStore(
    key: string,
    fetchFn: () => Promise<T>,
    onRevalidate?: (value: T) => void,
  ): Promise<T> {
    const existing = this.inflight.get(key) as Promise<T> | undefined;
    if (existing) return existing;

    const promise = (async () => {
      const value = await fetchFn();
      this.set(key, value);
      onRevalidate?.(value);
      return value;
    })();

    this.inflight.set(key, promise);
    return promise.finally(() => {
      this.inflight.delete(key);
    });
  }
}
