import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createOwnerApiGatewayMiddleware } from '../../shared/apiGatewayMiddleware.js';

async function runChain(
  chain: ReturnType<typeof createOwnerApiGatewayMiddleware>,
  req: Record<string, unknown>,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let index = 0;
    const runNext = () => {
      if (index >= chain.length) {
        resolve();
        return;
      }
      chain[index++](req as any, {} as any, (err?: unknown) => {
        if (err) reject(err);
        else runNext();
      });
    };
    runNext();
  });
}

describe('apiGatewayMiddleware', () => {
  it('resolves tenant, authenticates, and assigns capabilities for owner menu routes', async () => {
    let rateLimitCalled = false;
    let authCalled = false;
    const req: Record<string, unknown> = {
      path: '/menu/items',
      query: { tenantId: 'tenant-abc' },
      headers: {},
    };

    const chain = createOwnerApiGatewayMiddleware({
      rateLimit: (_req, _res, next) => {
        rateLimitCalled = true;
        next();
      },
      verifyAuth: (_req, _res, next) => {
        authCalled = true;
        next();
      },
    });

    await runChain(chain, req);

    assert.equal(rateLimitCalled, true);
    assert.equal(authCalled, true);
    assert.equal((req as { tenantId?: string }).tenantId, 'tenant-abc');
    assert.ok((req as { gatewayCapabilities?: string[] }).gatewayCapabilities?.includes('owner:menu'));
  });

  it('assigns base capabilities when optional hooks are omitted', async () => {
    const req: Record<string, unknown> = { path: '/profile', query: {}, headers: {}, body: {} };
    const chain = createOwnerApiGatewayMiddleware({});

    await runChain(chain, req);

    assert.ok((req as { gatewayCapabilities?: string[] }).gatewayCapabilities?.includes('owner:base'));
  });
});
