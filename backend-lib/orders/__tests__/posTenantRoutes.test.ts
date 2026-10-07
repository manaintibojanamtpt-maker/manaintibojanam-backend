/**
 * Which tenants a POS terminal may bind to.
 *
 * `selectPosTenants` is the filter the endpoint applies to the caller's raw
 * memberships, and it is where a privilege escalation would enter: if a
 * membership without a role were treated as "any staff", then any signed-in
 * account could trade in a restaurant it was merely associated with.
 */

import { it, describe } from 'node:test';
import assert from 'node:assert/strict';

import { POS_TENANT_ROLES, selectPosTenants } from '../../domain/posTenantRoutes';

describe('POS tenant selection', () => {
  it('keeps memberships whose role is meaningful at a counter', () => {
    const selected = selectPosTenants([
      { tenantId: 'tenant_owner', role: 'owner' },
      { tenantId: 'tenant_manager', role: 'manager' },
      { tenantId: 'tenant_cashier', role: 'cashier' },
      { tenantId: 'tenant_kitchen', role: 'kitchen' },
    ]);

    assert.deepEqual(
      selected.map((entry) => entry.tenantId).sort(),
      ['tenant_cashier', 'tenant_kitchen', 'tenant_manager', 'tenant_owner']
    );
  });

  it('drops a membership with no role instead of defaulting it to a staff role', () => {
    const selected = selectPosTenants([
      { tenantId: 'tenant_roleless' },
      { tenantId: 'tenant_blank', role: '   ' },
      { tenantId: 'tenant_real', role: 'cashier' },
    ]);

    assert.deepEqual(
      selected.map((entry) => entry.tenantId),
      ['tenant_real'],
      'an account that was never granted POS authority must not be able to trade'
    );
  });

  it('rejects roles that are not POS roles, whatever the source', () => {
    const selected = selectPosTenants([
      { tenantId: 'tenant_a', role: 'platform-admin' },
      { tenantId: 'tenant_b', role: 'customer' },
      { tenantId: 'tenant_c', role: 'delivery-partner' },
    ]);

    assert.deepEqual(selected, [], 'only POS counter roles may operate a terminal');
  });

  it('is case and whitespace insensitive on the role', () => {
    const selected = selectPosTenants([
      { tenantId: 'tenant_a', role: '  OWNER ' },
      { tenantId: 'tenant_b', role: 'Cashier' },
    ]);

    assert.equal(selected.length, 2);
    assert.equal(selected[0]?.role, 'owner');
    assert.equal(selected[1]?.role, 'cashier');
  });

  it('keeps the strongest role when a tenant appears more than once', () => {
    const selected = selectPosTenants([
      { tenantId: 'tenant_a', role: 'cashier' },
      { tenantId: 'tenant_a', role: 'owner' },
    ]);

    assert.equal(selected.length, 1, 'a tenant is offered once');
    assert.equal(selected[0]?.role, 'owner', 'the strongest role is the one shown and enforced');
  });

  it('ignores an empty or whitespace tenant id', () => {
    const selected = selectPosTenants([
      { tenantId: '', role: 'owner' },
      { tenantId: '   ', role: 'owner' },
      { tenantId: 'tenant_ok', role: 'owner' },
    ]);

    assert.deepEqual(
      selected.map((entry) => entry.tenantId),
      ['tenant_ok'],
      'an empty tenant id must never become a bindable tenant'
    );
  });

  it('returns a stable order so the picker does not reshuffle between loads', () => {
    const memberships = [
      { tenantId: 'tenant_z', role: 'owner' },
      { tenantId: 'tenant_a', role: 'owner' },
      { tenantId: 'tenant_m', role: 'owner' },
    ];

    const first = selectPosTenants(memberships);
    const second = selectPosTenants([...memberships].reverse());

    assert.deepEqual(first, second, 'order does not depend on the order memberships arrive in');
    assert.deepEqual(
      first.map((entry) => entry.tenantId),
      ['tenant_a', 'tenant_m', 'tenant_z']
    );
  });

  it('has no tenant id baked in to fall back on', () => {
    // The old behaviour was a hardcoded id. Asserting the set is empty of any
    // non-empty id is awkward; what matters is that an empty membership list
    // yields nothing at all.
    assert.deepEqual(selectPosTenants([]), []);
    assert.ok(POS_TENANT_ROLES.size >= 1);
  });
});