import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

describe('owner rate limit policy', () => {
  it('excludes /api/owner from global limiter and mounts dedicated ownerApiLimiter', () => {
    const serverSource = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf8');

    assert.match(serverSource, /url\.startsWith\('\/api\/owner\/'\)/);
    assert.match(serverSource, /const ownerApiLimiter = rateLimit\(/);
    assert.match(serverSource, /rateLimit: ownerApiLimiter/);
    assert.match(serverSource, /OWNER_RATE_LIMIT_MAX/);
  });
});
