import type { ApiErrorBody, ApiFailure, ApiResult, ApiSuccess } from '@/types/marketplace';

export class MarketplaceApiError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly status?: number;
  readonly correlationId?: string;

  constructor(params: {
    code: string;
    message: string;
    retryable?: boolean;
    status?: number;
    correlationId?: string;
  }) {
    super(params.message);
    this.name = 'MarketplaceApiError';
    this.code = params.code;
    this.retryable = params.retryable ?? false;
    this.status = params.status;
    this.correlationId = params.correlationId;
  }
}

export function isApiSuccess<T>(result: ApiResult<T>): result is ApiSuccess<T> {
  return result.ok === true;
}

export function isApiFailure<T>(result: ApiResult<T>): result is ApiFailure {
  return result.ok === false;
}

export function mapApiFailureToError(
  failure: ApiFailure,
  status?: number,
  correlationId?: string,
): MarketplaceApiError {
  return new MarketplaceApiError({
    code: failure.error.code,
    message: failure.error.message,
    retryable: failure.error.retryable,
    status,
    correlationId,
  });
}

export function mapUnknownError(error: unknown): MarketplaceApiError {
  if (error instanceof MarketplaceApiError) {
    return error;
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new MarketplaceApiError({
      code: 'TIMEOUT',
      message: 'Request timed out — tap retry in a moment',
      retryable: true,
    });
  }
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (
    error instanceof TypeError ||
    /failed to fetch|networkerror|load failed|network request failed/i.test(message)
  ) {
    return new MarketplaceApiError({
      code: 'NETWORK_ERROR',
      message: 'Couldn’t reach OrderBhojan servers. Check your connection and retry.',
      retryable: true,
    });
  }
  return new MarketplaceApiError({
    code: 'UNKNOWN',
    message: message || 'Unknown error',
    retryable: false,
  });
}

export function toApiErrorBody(code: string, message: string, retryable = false): ApiErrorBody {
  return { code, message, retryable };
}
