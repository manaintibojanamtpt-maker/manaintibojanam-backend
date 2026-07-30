import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { orderbhojanRoot } from './testPaths';

const monorepoRoot = resolve(orderbhojanRoot, '..');

describe('owner category admin wiring', () => {
  it('registers owner category routes and page entry points', () => {
    const server = readFileSync(resolve(monorepoRoot, 'server.ts'), 'utf8');
    const app = readFileSync(resolve(monorepoRoot, 'src/App.tsx'), 'utf8');
    const menu = readFileSync(resolve(monorepoRoot, 'src/pages/owner/OwnerMenu.tsx'), 'utf8');
    const rules = readFileSync(resolve(monorepoRoot, 'firestore.rules'), 'utf8');

    assert.match(server, /registerOwnerCategoryRoutes/);
    assert.match(app, /OwnerCategories/);
    assert.match(app, /\/owner\/menu\/categories/);
    assert.match(menu, /Manage categories/);
    assert.match(menu, /categoryId/);
    assert.match(rules, /isTenantOwner\(resource\.data\.tenantId\)/);
  });
});
