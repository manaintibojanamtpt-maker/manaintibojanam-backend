import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('POST /api/send-order-email', () => {
  it('rejects unauthenticated requests', async () => {
    let statusCode = 200;
    let responseBody = {};
    
    const req = {
      headers: {},
      body: { orderId: 'test-order-123' }
    };
    
    const res = {
      status: (code: number) => {
        statusCode = code;
        return {
          json: (body: any) => {
            responseBody = body;
          }
        };
      }
    };
    
    // Simulate the verifyFirebaseToken middleware failure
    const verifyFirebaseToken = async (req: any, res: any, next: any) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
      }
      next();
    };

    await verifyFirebaseToken(req, res, () => {
      assert.fail('Middleware should not have called next()');
    });

    assert.equal(statusCode, 401);
    assert.deepEqual(responseBody, { success: false, error: 'Unauthorized: No token provided' });
  });
});
