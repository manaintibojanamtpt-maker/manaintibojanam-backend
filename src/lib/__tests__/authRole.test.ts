import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hasSuperadminPortalAccess, resolveAuthRole } from '../authRole';

describe('authRole super admin access', () => {
  it('grants founder email super admin portal access regardless of stored role', () => {
    assert.equal(
      hasSuperadminPortalAccess('manaintibojanamtpt@gmail.com', 'owner'),
      true,
    );
    assert.equal(hasSuperadminPortalAccess('manaintibojanamtpt@gmail.com', undefined), true);
    assert.equal(hasSuperadminPortalAccess('other@example.com', 'superadmin'), true);
    assert.equal(hasSuperadminPortalAccess('other@example.com', 'owner'), false);
  });

  it('keeps superadmin role for founder even with owned tenants', () => {
    assert.equal(
      resolveAuthRole('manaintibojanamtpt@gmail.com', 'owner', ['mana-inti']),
      'superadmin',
    );
    assert.equal(resolveAuthRole('manaintibojanamtpt@gmail.com', undefined, ['mana-inti']), 'superadmin');
  });

  it('does not downgrade explicit superadmin for non-founder owners', () => {
    assert.equal(resolveAuthRole('owner@kitchen.test', 'superadmin', ['tenant-a']), 'superadmin');
  });

  it('elevates tenant owners without an explicit role', () => {
    assert.equal(resolveAuthRole('owner@kitchen.test', undefined, ['tenant-a']), 'owner');
    assert.equal(resolveAuthRole('owner@kitchen.test', 'user', ['tenant-a']), 'owner');
  });
});
