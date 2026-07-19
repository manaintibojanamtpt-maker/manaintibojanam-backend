import { SEARCH_CLIENT_TIMEOUT_MS } from '../hooks/searchQueryKeys';

export class SearchClientTimeoutError extends Error {
  constructor() {
    super('SEARCH_CLIENT_TIMEOUT');
    this.name = 'SearchClientTimeoutError';
  }
}

export function withSearchClientTimeout<T>(
  promise: Promise<T>,
  timeoutMs = SEARCH_CLIENT_TIMEOUT_MS,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new SearchClientTimeoutError()), timeoutMs);
    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}
