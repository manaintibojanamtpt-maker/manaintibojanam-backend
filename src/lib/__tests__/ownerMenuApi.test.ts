import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('owner menu API migration', () => {
  it('loads menu via owner API without Firestore onSnapshot', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/pages/owner/OwnerMenu.tsx'),
      'utf8',
    );
    assert.match(source, /fetchOwnerMenuItems/);
    assert.doesNotMatch(source, /onSnapshot/);
    assert.doesNotMatch(source, /getDb\(\)/);
  });

  it('menu mutations do not fall back to direct Firestore writes', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/services/api.ts'),
      'utf8',
    );
    assert.match(source, /ownerApiRequest/);
    assert.doesNotMatch(source, /falling back to Firestore client/);
  });

  it('owner menu editor persists variants and addon groups via API payload', () => {
    const menuSource = fs.readFileSync(
      path.join(process.cwd(), 'src/pages/owner/OwnerMenu.tsx'),
      'utf8',
    );
    assert.match(menuSource, /MenuItemOptionsEditor/);
    assert.match(menuSource, /variants: normalizeVariantsForSave/);
    assert.match(menuSource, /addonGroups: normalizeAddonGroupsForSave/);
  });

  it('exposes stock update helper for inventory operations', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/ownerMenuApi.ts'),
      'utf8',
    );
    assert.match(source, /updateOwnerMenuItemStock/);
  });
});
