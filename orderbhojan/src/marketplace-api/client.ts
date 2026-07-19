import { getAppConfig } from '@/config';
import { shouldBypassMarketplaceHttpCache } from '@/config/marketplaceQueryPolicy';
import { generateCorrelationId } from '@/utils';
import type { ApiResult } from '@/types/marketplace';
import {
  mapApiFailureToError,
  mapUnknownError,
  MarketplaceApiError,
} from './errors';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface MarketplaceRequestOptions {
  readonly method?: HttpMethod;
  readonly path: string;
  readonly query?: Record<string, string | number | boolean | undefined>;
  readonly body?: unknown;
  readonly headers?: Record<string, string>;
  readonly authToken?: string | null;
  readonly contextToken?: string | null;
  readonly correlationId?: string;
  readonly signal?: AbortSignal;
  readonly bypassHttpCache?: boolean;
  readonly timeoutMs?: number;
}

export interface MarketplaceClientConfig {
  readonly baseUrl: string;
  readonly apiVersion: string;
  readonly timeoutMs: number;
  readonly retryAttempts: number;
  readonly retryDelayMs: number;
  readonly getAuthToken?: () => Promise<string | null>;
}

export class MarketplaceHttpClient {
  private readonly config: MarketplaceClientConfig;
  private sessionCorrelationId: string;

  constructor(config: MarketplaceClientConfig) {
    this.config = config;
    this.sessionCorrelationId = generateCorrelationId();
  }

  getSessionCorrelationId(): string {
    return this.sessionCorrelationId;
  }

  resetSessionCorrelationId(): void {
    this.sessionCorrelationId = generateCorrelationId();
  }

  async request<T>(options: MarketplaceRequestOptions): Promise<T> {
    const correlationId = options.correlationId ?? this.sessionCorrelationId;
    let lastError: MarketplaceApiError | null = null;

    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        return await this.executeOnce<T>(options, correlationId);
      } catch (error) {
        const mapped = mapUnknownError(error);
        lastError = mapped;
        const shouldRetry = mapped.retryable && attempt < this.config.retryAttempts;
        if (!shouldRetry) {
          throw mapped;
        }
        await new Promise((r) => setTimeout(r, this.config.retryDelayMs * (attempt + 1)));
      }
    }

    throw lastError ?? new MarketplaceApiError({ code: 'UNKNOWN', message: 'Request failed' });
  }

  private async executeOnce<T>(
    options: MarketplaceRequestOptions,
    correlationId: string,
  ): Promise<T> {
    const url = this.buildUrl(options.path, options.query);
    const controller = new AbortController();
    const timeoutMs = options.timeoutMs ?? this.config.timeoutMs;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const token =
      options.authToken !== undefined
        ? options.authToken
        : this.config.getAuthToken
          ? await this.config.getAuthToken()
          : null;

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Correlation-Id': correlationId,
      'X-Marketplace-API-Version': this.config.apiVersion,
      ...(options.bypassHttpCache ?? shouldBypassMarketplaceHttpCache()
        ? { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
        : {}),
      ...options.headers,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    if (options.contextToken) {
      headers['X-Context-Token'] = options.contextToken;
    }

    try {
      const response = await fetch(url, {
        method: options.method ?? 'GET',
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: options.signal ?? controller.signal,
      });

      const responseCorrelationId =
        response.headers.get('X-Correlation-Id') ?? correlationId;

      let payload: ApiResult<T> | null = null;
      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        payload = (await response.json()) as ApiResult<T>;
      }

      if (!response.ok) {
        if (payload && 'ok' in payload && payload.ok === false) {
          throw mapApiFailureToError(payload, response.status, responseCorrelationId);
        }
        throw new MarketplaceApiError({
          code: `HTTP_${response.status}`,
          message: response.statusText || 'Request failed',
          status: response.status,
          correlationId: responseCorrelationId,
          retryable: response.status >= 500 || response.status === 429,
        });
      }

      if (!payload) {
        throw new MarketplaceApiError({
          code: 'INVALID_RESPONSE',
          message: 'Expected JSON response',
          status: response.status,
          correlationId: responseCorrelationId,
        });
      }

      if ('ok' in payload && payload.ok === false) {
        throw mapApiFailureToError(payload, response.status, responseCorrelationId);
      }

      if ('ok' in payload && payload.ok === true) {
        return payload.value;
      }

      return payload as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildUrl(
    path: string,
    query?: Record<string, string | number | boolean | undefined>,
  ): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const base = this.config.baseUrl.replace(/\/$/, '');
    const qs =
      query && Object.keys(query).length > 0
        ? `?${new URLSearchParams(
            Object.entries(query)
              .filter(([, v]) => v !== undefined && v !== '')
              .map(([k, v]) => [k, String(v)]),
          ).toString()}`
        : '';
    return `${base}${normalizedPath}${qs}`;
  }
}

export function createMarketplaceHttpClient(
  overrides: Partial<MarketplaceClientConfig> = {},
): MarketplaceHttpClient {
  const app = getAppConfig();
  return new MarketplaceHttpClient({
    baseUrl: app.marketplaceApiBaseUrl,
    apiVersion: app.marketplaceApiVersion,
    timeoutMs: app.api.timeoutMs,
    retryAttempts: app.api.retryAttempts,
    retryDelayMs: app.api.retryDelayMs,
    ...overrides,
  });
}
