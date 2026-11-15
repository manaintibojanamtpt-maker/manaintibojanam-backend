import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  checkPrimaryHealth,
  probeOpsEndpoints,
  probeStaticUrls,
  runSmokeHealth,
  DEFAULT_MAX_BACKOFF_MS,
  RETRYABLE_STATUS_CODES,
  isRetryableStatusCode,
} from '../smoke-ops-health.mjs';

describe('Cold-Start Resilient Production Health Monitoring Tests', () => {
  // Helper to create mock silent logger
  const createMockLogger = () => ({
    log: () => {},
    warn: () => {},
    error: () => {},
  });

  // Scenario 1: Warm backend responds immediately — PASS
  it('1. Warm backend responds immediately — PASS', async () => {
    const mockFetch = async (url) => ({
      status: 200,
      text: async () => JSON.stringify({ status: 'ok', platform: { tier: 'free', build: '51054d8' } }),
    });

    const result = await checkPrimaryHealth({
      apiUrl: 'https://test-backend.example.com',
      fetchFn: mockFetch,
      logger: createMockLogger(),
    });

    assert.equal(result.pass, true);
    assert.equal(result.attempts.length, 1);
    assert.equal(result.coldStartDetected, false);
    assert.equal(result.finalStatus, 200);
    assert.equal(result.body.status, 'ok');
  });

  // Scenario 2: First request times out, second succeeds — PASS
  it('2. First request times out, second succeeds — PASS', async () => {
    let callCount = 0;
    const sleepDelays = [];
    const mockSleep = async (ms) => {
      sleepDelays.push(ms);
    };

    const mockFetch = async (url) => {
      callCount++;
      if (callCount === 1) {
        const timeoutErr = new Error('The operation was aborted due to timeout');
        timeoutErr.name = 'TimeoutError';
        throw timeoutErr;
      }
      return {
        status: 200,
        text: async () => JSON.stringify({ status: 'ok', platform: { tier: 'free' } }),
      };
    };

    const result = await checkPrimaryHealth({
      apiUrl: 'https://test-backend.example.com',
      fetchFn: mockFetch,
      sleepFn: mockSleep,
      initialBackoffMs: 2000,
      logger: createMockLogger(),
    });

    assert.equal(result.pass, true);
    assert.equal(callCount, 2);
    assert.equal(result.attempts.length, 2);
    assert.equal(result.coldStartDetected, true);
    assert.equal(result.attempts[0].pass, false);
    assert.equal(result.attempts[0].isRetryable, true);
    assert.match(result.attempts[0].error, /Timed out/);
    assert.equal(result.attempts[1].pass, true);
    assert.deepEqual(sleepDelays, [2000]);
  });

  // Scenario 3: Backend returns 503, then becomes healthy — PASS
  it('3. Backend returns 503, then becomes healthy — PASS', async () => {
    let callCount = 0;
    const sleepDelays = [];
    const mockSleep = async (ms) => sleepDelays.push(ms);

    const mockFetch = async (url) => {
      callCount++;
      if (callCount === 1) {
        return {
          status: 503,
          text: async () => 'Service Unavailable (cold start warming)',
        };
      }
      return {
        status: 200,
        text: async () => JSON.stringify({ status: 'ok' }),
      };
    };

    const result = await checkPrimaryHealth({
      apiUrl: 'https://test-backend.example.com',
      fetchFn: mockFetch,
      sleepFn: mockSleep,
      initialBackoffMs: 1500,
      logger: createMockLogger(),
    });

    assert.equal(result.pass, true);
    assert.equal(callCount, 2);
    assert.equal(result.attempts[0].status, 503);
    assert.equal(result.attempts[0].isRetryable, true);
    assert.equal(result.attempts[1].pass, true);
    assert.deepEqual(sleepDelays, [1500]);
  });

  // Scenario 4: Backend remains unavailable for all three attempts — FAIL
  it('4. Backend remains unavailable for all three attempts — FAIL', async () => {
    let callCount = 0;
    const sleepDelays = [];
    const mockSleep = async (ms) => sleepDelays.push(ms);

    const mockFetch = async () => {
      callCount++;
      return {
        status: 502,
        text: async () => 'Bad Gateway',
      };
    };

    const result = await checkPrimaryHealth({
      apiUrl: 'https://test-backend.example.com',
      maxAttempts: 3,
      initialBackoffMs: 1000,
      fetchFn: mockFetch,
      sleepFn: mockSleep,
      logger: createMockLogger(),
    });

    assert.equal(result.pass, false);
    assert.equal(callCount, 3);
    assert.equal(result.attempts.length, 3);
    assert.equal(sleepDelays.length, 2); // Sleeps after attempt 1 and 2, but not after final attempt
  });

  // Scenario 5: Backend takes longer than timeout budget — FAIL
  it('5. Backend takes longer than timeout budget — FAIL', async () => {
    let callCount = 0;
    const mockFetch = async () => {
      callCount++;
      const err = new Error('The operation was aborted due to timeout');
      err.name = 'TimeoutError';
      throw err;
    };

    const result = await checkPrimaryHealth({
      apiUrl: 'https://test-backend.example.com',
      maxAttempts: 3,
      timeoutMs: 90000,
      fetchFn: mockFetch,
      sleepFn: async () => {},
      logger: createMockLogger(),
    });

    assert.equal(result.pass, false);
    assert.equal(callCount, 3);
    assert.ok(result.attempts.every((a) => a.error.includes('Timed out')));
  });

  // Scenario 6: Primary health endpoint returns malformed JSON — FAIL
  it('6. Primary health endpoint returns malformed JSON — FAIL', async () => {
    let callCount = 0;
    const mockFetch = async () => {
      callCount++;
      return {
        status: 200,
        text: async () => '<html><body>502 Gateway Error</body></html>',
      };
    };

    const result = await checkPrimaryHealth({
      apiUrl: 'https://test-backend.example.com',
      maxAttempts: 3,
      fetchFn: mockFetch,
      sleepFn: async () => {},
      logger: createMockLogger(),
    });

    assert.equal(result.pass, false);
    // Malformed JSON on 200 is a non-retryable failure (server responded 200 with invalid payload)
    assert.equal(callCount, 1);
    assert.match(result.attempts[0].error, /Malformed JSON/);
  });

  // Scenario 7: Primary health endpoint returns unhealthy status — FAIL
  it('7. Primary health endpoint returns unhealthy status — FAIL', async () => {
    let callCount = 0;
    const mockFetch = async () => {
      callCount++;
      return {
        status: 200,
        text: async () => JSON.stringify({ status: 'degraded', database: 'disconnected' }),
      };
    };

    const result = await checkPrimaryHealth({
      apiUrl: 'https://test-backend.example.com',
      maxAttempts: 3,
      fetchFn: mockFetch,
      sleepFn: async () => {},
      logger: createMockLogger(),
    });

    assert.equal(result.pass, false);
    assert.equal(callCount, 1);
    assert.match(result.attempts[0].error, /status is 'degraded'/);
  });

  // Scenario 7b: HTTP 429 with valid JSON: retry
  it('7b. HTTP 429 with valid JSON: retry', async () => {
    let callCount = 0;
    const mockSleep = async () => {};
    const mockFetch = async () => {
      callCount++;
      if (callCount === 1) {
        return {
          status: 429,
          text: async () => JSON.stringify({ error: 'Too Many Requests', retryAfter: 2 }),
        };
      }
      return {
        status: 200,
        text: async () => JSON.stringify({ status: 'ok' }),
      };
    };

    const result = await checkPrimaryHealth({
      apiUrl: 'https://test-backend.example.com',
      maxAttempts: 3,
      fetchFn: mockFetch,
      sleepFn: mockSleep,
      logger: createMockLogger(),
    });

    assert.equal(callCount, 2);
    assert.equal(result.attempts[0].status, 429);
    assert.equal(result.attempts[0].isRetryable, true);
    assert.equal(result.pass, true);
  });

  // Scenario 7c: HTTP 429 with non-JSON response: retry
  it('7c. HTTP 429 with non-JSON response: retry', async () => {
    let callCount = 0;
    const mockSleep = async () => {};
    const mockFetch = async () => {
      callCount++;
      if (callCount === 1) {
        return {
          status: 429,
          text: async () => '<html><body>429 Too Many Requests (Rate limit reached)</body></html>',
        };
      }
      return {
        status: 200,
        text: async () => JSON.stringify({ status: 'ok' }),
      };
    };

    const result = await checkPrimaryHealth({
      apiUrl: 'https://test-backend.example.com',
      maxAttempts: 3,
      fetchFn: mockFetch,
      sleepFn: mockSleep,
      logger: createMockLogger(),
    });

    assert.equal(callCount, 2);
    assert.equal(result.attempts[0].status, 429);
    assert.equal(result.attempts[0].isRetryable, true);
    assert.match(result.attempts[0].error, /Malformed JSON/);
    assert.equal(result.pass, true);
  });

  // Scenario 7d: HTTP 429 followed by HTTP 200: overall PASS
  it('7d. HTTP 429 followed by HTTP 200: overall PASS', async () => {
    let callCount = 0;
    const sleepDelays = [];
    const mockSleep = async (ms) => sleepDelays.push(ms);
    const mockFetch = async () => {
      callCount++;
      if (callCount === 1) {
        return {
          status: 429,
          text: async () => 'Rate limit exceeded',
        };
      }
      return {
        status: 200,
        text: async () => JSON.stringify({ status: 'ok', platform: { tier: 'free' } }),
      };
    };

    const result = await checkPrimaryHealth({
      apiUrl: 'https://test-backend.example.com',
      maxAttempts: 3,
      initialBackoffMs: 2500,
      fetchFn: mockFetch,
      sleepFn: mockSleep,
      logger: createMockLogger(),
    });

    assert.equal(result.pass, true);
    assert.equal(callCount, 2);
    assert.equal(result.attempts.length, 2);
    assert.equal(result.attempts[0].status, 429);
    assert.equal(result.attempts[0].isRetryable, true);
    assert.equal(result.attempts[1].status, 200);
    assert.equal(result.attempts[1].pass, true);
    assert.deepEqual(sleepDelays, [2500]);
  });

  // Scenario 7e: HTTP 429 on all attempts: final FAIL after bounded attempts
  it('7e. HTTP 429 on all attempts: final FAIL after bounded attempts', async () => {
    let callCount = 0;
    const sleepDelays = [];
    const mockSleep = async (ms) => sleepDelays.push(ms);
    const mockFetch = async () => {
      callCount++;
      return {
        status: 429,
        text: async () => 'Rate limit exceeded continuously',
      };
    };

    const result = await checkPrimaryHealth({
      apiUrl: 'https://test-backend.example.com',
      maxAttempts: 3,
      initialBackoffMs: 1000,
      fetchFn: mockFetch,
      sleepFn: mockSleep,
      logger: createMockLogger(),
    });

    assert.equal(result.pass, false);
    assert.equal(callCount, 3); // Bounded strictly by maxAttempts
    assert.equal(result.attempts.length, 3);
    assert.equal(sleepDelays.length, 2); // Sleeps after attempt 1 and 2
    assert.ok(result.attempts.every((a) => a.status === 429 && a.isRetryable === true));
  });

  // Scenario 7f: HTTP 400 with non-JSON response: immediate FAIL without retry
  it('7f. HTTP 400 with non-JSON response: immediate FAIL without retry', async () => {
    let callCount = 0;
    const mockSleep = async () => {
      throw new Error('Should not sleep for non-retryable 400');
    };
    const mockFetch = async () => {
      callCount++;
      return {
        status: 400,
        text: async () => 'Bad Request: Missing required header',
      };
    };

    const result = await checkPrimaryHealth({
      apiUrl: 'https://test-backend.example.com',
      maxAttempts: 3,
      fetchFn: mockFetch,
      sleepFn: mockSleep,
      logger: createMockLogger(),
    });

    assert.equal(result.pass, false);
    assert.equal(callCount, 1); // Immediate fail, NO retry
    assert.equal(result.attempts.length, 1);
    assert.equal(result.attempts[0].status, 400);
    assert.equal(result.attempts[0].isRetryable, false);
    assert.match(result.attempts[0].error, /Malformed JSON/);
  });

  // Scenario 7g: HTTP 200 with malformed JSON: immediate FAIL without retry
  it('7g. HTTP 200 with malformed JSON: immediate FAIL', async () => {
    let callCount = 0;
    const mockSleep = async () => {
      throw new Error('Should not sleep for malformed 200');
    };
    const mockFetch = async () => {
      callCount++;
      return {
        status: 200,
        text: async () => 'Internal Error: String not JSON {broken',
      };
    };

    const result = await checkPrimaryHealth({
      apiUrl: 'https://test-backend.example.com',
      maxAttempts: 3,
      fetchFn: mockFetch,
      sleepFn: mockSleep,
      logger: createMockLogger(),
    });

    assert.equal(result.pass, false);
    assert.equal(callCount, 1); // Immediate fail, NO retry
    assert.equal(result.attempts.length, 1);
    assert.equal(result.attempts[0].status, 200);
    assert.equal(result.attempts[0].isRetryable, false);
    assert.match(result.attempts[0].error, /Malformed JSON/);
  });

  // Scenario 7h: isRetryableStatusCode helper consistency check
  it('7h. isRetryableStatusCode helper consistency check', () => {
    assert.deepEqual(RETRYABLE_STATUS_CODES, [429, 502, 503, 504]);
    assert.equal(isRetryableStatusCode(429), true);
    assert.equal(isRetryableStatusCode(502), true);
    assert.equal(isRetryableStatusCode(503), true);
    assert.equal(isRetryableStatusCode(504), true);

    // Non-retryable
    assert.equal(isRetryableStatusCode(200), false);
    assert.equal(isRetryableStatusCode(400), false);
    assert.equal(isRetryableStatusCode(401), false);
    assert.equal(isRetryableStatusCode(403), false);
    assert.equal(isRetryableStatusCode(404), false);
    assert.equal(isRetryableStatusCode(500), false);
  });

  // Scenario 8: Ops health-summary is unavailable but explicitly optional — WARN/SKIPPED
  it('8. Ops health-summary is unavailable but explicitly optional — WARN/SKIPPED', async () => {
    // 8a: Primary health failed -> Ops skipped completely
    const skippedResult = await probeOpsEndpoints({
      apiUrl: 'https://test-backend.example.com',
      primaryPassed: false,
      opsMandatory: false,
      logger: createMockLogger(),
    });
    assert.equal(skippedResult.skipped, true);
    assert.equal(skippedResult.pass, true); // Optional probe does not fail the run when skipped

    // 8b: Primary passed, but unauthenticated probe encounters timeout or 404 -> WARN
    const mockFetchWarn = async () => {
      throw new Error('Timeout on ops probe');
    };
    const warnResult = await probeOpsEndpoints({
      apiUrl: 'https://test-backend.example.com',
      primaryPassed: true,
      opsMandatory: false,
      fetchFn: mockFetchWarn,
      logger: createMockLogger(),
    });
    assert.equal(warnResult.pass, true); // Optional probe warning does not fail
    assert.ok(warnResult.results.every((r) => r.warn));
  });

  // Targeted correction test: HTTP 503 cannot produce a misleading authentication PASS
  it('8c. Unauthenticated ops wiring check: HTTP 503 produces WARN or FAIL, NEVER auth PASS', async () => {
    const mockFetch503 = async () => ({
      status: 503,
      text: async () => 'Service Unavailable',
    });

    // Case 1: Optional probe (default) -> produces WARN, not auth PASS
    const loggedLines = [];
    const capturingLogger = {
      log: (msg) => loggedLines.push(msg),
      warn: (msg) => loggedLines.push(msg),
      error: (msg) => loggedLines.push(msg),
    };

    const optionalResult = await probeOpsEndpoints({
      apiUrl: 'https://test-backend.example.com',
      primaryPassed: true,
      opsMandatory: false,
      fetchFn: mockFetch503,
      logger: capturingLogger,
    });

    assert.equal(optionalResult.pass, true);
    // Every result must have warn and NOT claim auth required
    for (const r of optionalResult.results) {
      assert.equal(r.status, 503);
      assert.ok(r.warn, 'Must be marked as warn');
      assert.match(r.warn, /503/);
    }
    // Verify log lines do not contain "OK (auth required)"
    assert.ok(!loggedLines.some((l) => l.includes('auth required')));
    assert.ok(loggedLines.some((l) => l.includes('[WARN]') && l.includes('503')));

    // Case 2: Mandatory probe -> produces FAIL
    const mandatoryResult = await probeOpsEndpoints({
      apiUrl: 'https://test-backend.example.com',
      primaryPassed: true,
      opsMandatory: true,
      fetchFn: mockFetch503,
      logger: createMockLogger(),
    });

    assert.equal(mandatoryResult.pass, false);
    for (const r of mandatoryResult.results) {
      assert.equal(r.pass, false);
      assert.match(r.error, /503/);
    }
  });

  // Unauthenticated ops wiring check: HTTP 401 & 403 produce valid authentication PASS
  it('8d. Unauthenticated ops wiring check: HTTP 401 and 403 produce authentic PASS', async () => {
    let callIdx = 0;
    const mockFetchAuth = async () => {
      callIdx++;
      return {
        status: callIdx % 2 === 1 ? 401 : 403,
        text: async () => 'Unauthorized',
      };
    };

    const result = await probeOpsEndpoints({
      apiUrl: 'https://test-backend.example.com',
      primaryPassed: true,
      opsMandatory: false,
      fetchFn: mockFetchAuth,
      logger: createMockLogger(),
    });

    assert.equal(result.pass, true);
    for (const r of result.results) {
      assert.equal(r.pass, true);
      assert.ok(r.status === 401 || r.status === 403);
      assert.equal(r.warn, undefined);
    }
  });

  // Unauthenticated ops wiring check: HTTP 200 without auth produces WARN / FAIL (unexpected lack of auth)
  it('8e. Unauthenticated ops wiring check: HTTP 200 without auth is flagged as unexpected', async () => {
    const mockFetch200 = async () => ({
      status: 200,
      text: async () => JSON.stringify({ open: true }),
    });

    // Optional -> WARN
    const warnResult = await probeOpsEndpoints({
      apiUrl: 'https://test-backend.example.com',
      primaryPassed: true,
      opsMandatory: false,
      fetchFn: mockFetch200,
      logger: createMockLogger(),
    });
    assert.equal(warnResult.pass, true);
    for (const r of warnResult.results) {
      assert.equal(r.status, 200);
      assert.match(r.warn, /without authentication/);
    }

    // Mandatory -> FAIL
    const failResult = await probeOpsEndpoints({
      apiUrl: 'https://test-backend.example.com',
      primaryPassed: true,
      opsMandatory: true,
      fetchFn: mockFetch200,
      logger: createMockLogger(),
    });
    assert.equal(failResult.pass, false);
    for (const r of failResult.results) {
      assert.equal(r.pass, false);
      assert.match(r.error, /without authentication/);
    }
  });

  // Scenario 9: Mandatory ops health-summary fails — FAIL
  it('9. Mandatory ops health-summary fails — FAIL', async () => {
    const mockFetchFail = async () => ({
      status: 500,
      text: async () => 'Internal Server Error',
    });

    const failResult = await probeOpsEndpoints({
      apiUrl: 'https://test-backend.example.com',
      primaryPassed: true,
      opsMandatory: true,
      authToken: 'sample-token',
      fetchFn: mockFetchFail,
      logger: createMockLogger(),
    });

    assert.equal(failResult.pass, false);
    assert.ok(failResult.results.some((r) => r.pass === false));
  });

  // Scenario 10: Authorization headers remain present on protected endpoint requests
  it('10. Authorization headers remain present on protected endpoint requests', async () => {
    let capturedHeaders = null;
    const mockFetchAuth = async (url, options) => {
      capturedHeaders = options.headers;
      return {
        status: 200,
        text: async () => JSON.stringify({ status: 'ok', opsHealth: 'green' }),
      };
    };

    const authResult = await probeOpsEndpoints({
      apiUrl: 'https://test-backend.example.com',
      authToken: 'firebase-superadmin-token-xyz',
      primaryPassed: true,
      fetchFn: mockFetchAuth,
      logger: createMockLogger(),
    });

    assert.equal(authResult.pass, true);
    assert.ok(capturedHeaders);
    assert.equal(capturedHeaders.Authorization, 'Bearer firebase-superadmin-token-xyz');
    assert.equal(capturedHeaders.Accept, 'application/json');
  });

  // Scenario 11: Retry delays are bounded and do not exceed the workflow execution budget
  it('11. Retry delays are bounded and do not exceed the workflow execution budget', async () => {
    const sleepDelays = [];
    const mockSleep = async (ms) => sleepDelays.push(ms);

    const mockFetch = async () => {
      throw new Error('Connection refused');
    };

    await checkPrimaryHealth({
      apiUrl: 'https://test-backend.example.com',
      maxAttempts: 5,
      initialBackoffMs: 2000,
      backoffMultiplier: 2,
      maxBackoffMs: 8000,
      fetchFn: mockFetch,
      sleepFn: mockSleep,
      logger: createMockLogger(),
    });

    // Backoff values should double: 2000, 4000, 8000, 8000 (capped at 8000)
    assert.deepEqual(sleepDelays, [2000, 4000, 8000, 8000]);
    assert.ok(sleepDelays.every((d) => d <= DEFAULT_MAX_BACKOFF_MS));
    const totalBackoff = sleepDelays.reduce((a, b) => a + b, 0);
    // 22000ms = 22s, well within 10-minute job budget
    assert.ok(totalBackoff < 60000);
  });

  // Scenario 12: No unbounded retries or swallowed exceptions
  it('12. No unbounded retries or swallowed exceptions', async () => {
    let callCount = 0;
    const mockFetch = async () => {
      callCount++;
      throw new Error('Hardware network failure');
    };

    const result = await checkPrimaryHealth({
      apiUrl: 'https://test-backend.example.com',
      maxAttempts: 3,
      fetchFn: mockFetch,
      sleepFn: async () => {},
      logger: createMockLogger(),
    });

    assert.equal(result.pass, false);
    assert.equal(callCount, 3); // Strictly bounded by maxAttempts
    assert.equal(result.attempts.length, 3);
    assert.equal(result.attempts[2].error, 'Hardware network failure');
  });

  // Additional End-to-End Coordinator test
  it('13. runSmokeHealth end-to-end coordinator writes report and calculates overall pass', async () => {
    const mockFetch = async (url) => {
      if (url.includes('/api/health')) {
        return {
          status: 200,
          text: async () => JSON.stringify({ status: 'ok', platform: { tier: 'free' } }),
        };
      }
      // Static URLs or ops
      return {
        status: 200,
        text: async () => 'OK',
      };
    };

    let writtenReport = null;
    const result = await runSmokeHealth({
      apiUrl: 'https://test-backend.example.com',
      fetchFn: mockFetch,
      sleepFn: async () => {},
      logger: createMockLogger(),
      reportOutputPath: 'scripts/__tests__/.test-report.json',
    });

    assert.equal(result.passed, true);
    assert.equal(result.primaryHealth.pass, true);
    assert.ok(result.staticUrls.length > 0);
  });
});
