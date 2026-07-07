export interface FirestoreRetryPolicyOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Consecutive failures before the circuit opens. */
  circuitFailureThreshold?: number;
  /** How long the circuit stays open before half-open probe. */
  circuitOpenMs?: number;
}

export class FirestoreQuotaError extends Error {
  readonly code = 'firestore/quota-exceeded';

  constructor(message = 'Firestore quota exceeded') {
    super(message);
    this.name = 'FirestoreQuotaError';
  }
}

const DEFAULTS: Required<FirestoreRetryPolicyOptions> = {
  maxAttempts: 4,
  baseDelayMs: 250,
  maxDelayMs: 8_000,
  circuitFailureThreshold: 5,
  circuitOpenMs: 30_000,
};

export function isFirestoreQuotaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  const code = (error as { code?: string | number })?.code;
  return (
    code === 8 ||
    code === 'resource-exhausted' ||
    lower.includes('quota exceeded') ||
    lower.includes('resource_exhausted') ||
    lower.includes('too many requests')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffDelay(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const exponential = baseDelayMs * 2 ** attempt;
  const jitter = Math.floor(Math.random() * baseDelayMs);
  return Math.min(maxDelayMs, exponential + jitter);
}

/**
 * Client-side Firestore quota protection: exponential backoff, circuit breaker,
 * and in-flight request coalescing for identical read operations.
 */
export class FirestoreRetryPolicy {
  private readonly options: Required<FirestoreRetryPolicyOptions>;
  private consecutiveFailures = 0;
  private circuitOpenUntil = 0;
  private readonly inflight = new Map<string, Promise<unknown>>();

  constructor(options: FirestoreRetryPolicyOptions = {}) {
    this.options = { ...DEFAULTS, ...options };
  }

  get isCircuitOpen(): boolean {
    return Date.now() < this.circuitOpenUntil;
  }

  resetCircuit(): void {
    this.consecutiveFailures = 0;
    this.circuitOpenUntil = 0;
  }

  private noteSuccess(): void {
    this.consecutiveFailures = 0;
    this.circuitOpenUntil = 0;
  }

  private noteFailure(error: unknown): void {
    if (!isFirestoreQuotaError(error)) return;
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.options.circuitFailureThreshold) {
      this.circuitOpenUntil = Date.now() + this.options.circuitOpenMs;
    }
  }

  private assertCircuitClosed(): void {
    if (this.isCircuitOpen) {
      throw new FirestoreQuotaError('Firestore circuit open — reads temporarily paused');
    }
  }

  /**
   * Executes a Firestore read with retry, circuit breaker, and coalescing.
   * `coalesceKey` should identify the logical read (e.g. doc path or query hash).
   */
  async executeRead<T>(coalesceKey: string, operation: () => Promise<T>): Promise<T> {
    this.assertCircuitClosed();

    const inflight = this.inflight.get(coalesceKey) as Promise<T> | undefined;
    if (inflight) return inflight;

    const promise = this.executeWithRetry(operation);
    this.inflight.set(coalesceKey, promise);

    try {
      return await promise;
    } finally {
      this.inflight.delete(coalesceKey);
    }
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt < this.options.maxAttempts; attempt += 1) {
      try {
        const result = await operation();
        this.noteSuccess();
        return result;
      } catch (error) {
        lastError = error;

        if (!isFirestoreQuotaError(error) || attempt >= this.options.maxAttempts - 1) {
          this.noteFailure(error);
          throw error;
        }

        if (this.isCircuitOpen) {
          throw new FirestoreQuotaError('Firestore circuit open — reads temporarily paused');
        }

        await sleep(backoffDelay(attempt, this.options.baseDelayMs, this.options.maxDelayMs));
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }
}

/** Shared singleton for client Firestore reads. */
export const defaultFirestoreRetryPolicy = new FirestoreRetryPolicy();
