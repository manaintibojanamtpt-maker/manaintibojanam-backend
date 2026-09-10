import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readMonorepoFile } from './testPaths';

describe('owner category admin wiring', () => {
  it('registers owner category routes and page entry points', () => {
    const server = readMonorepoFile('server.ts');
    const app = readMonorepoFile('src/App.tsx');
    const menu = readMonorepoFile('src/pages/owner/OwnerMenu.tsx');
    const rules = readMonorepoFile('firestore.rules');

    assert.match(server, /registerOwnerCategoryRoutes/);
    assert.match(app, /OwnerCategories/);
    assert.match(app, /\/owner\/menu\/categories/);
    assert.match(menu, /Manage categories/);
    assert.match(menu, /categoryId/);
    assert.match(rules, /isTenantOwner\(resource\.data\.tenantId\)/);
  });
});
