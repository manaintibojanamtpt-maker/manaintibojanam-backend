import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const routesPath = join(__dirname, '..', 'marketplaceCustomerRoutes.ts');

describe('marketplace notification register route', () => {
  it('mirrors registered tokens into users.deviceTokens for FCM delivery', () => {
    const source = readFileSync(routesPath, 'utf8');
    assert.match(source, /notifications\/register/);
    assert.match(source, /notificationTokens:\s*fieldValue\.arrayUnion/);
    assert.match(source, /collection\('users'\)\.doc\(uid\)/);
    assert.match(source, /deviceTokens:\s*fieldValue\.arrayUnion\(token\)/);
  });
});
