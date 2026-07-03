/**
 * BhojanOS SDK — HTTP transport contract (no fetch/axios implementation).
 */

import type { SdkAsyncResult } from '../core/result';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface HttpRequestOptions {
  readonly method: HttpMethod;
  readonly path: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: unknown;
  readonly timeoutMs?: number;
}

export interface HttpResponse<T = unknown> {
  readonly status: number;
  readonly data: T;
  readonly headers?: Readonly<Record<string, string>>;
}

export interface HttpAdapter {
  request<TResponse>(options: HttpRequestOptions): SdkAsyncResult<HttpResponse<TResponse>>;
}
