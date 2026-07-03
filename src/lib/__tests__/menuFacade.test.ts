import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { sdkError, sdkFail, sdkOk } from '../../sdk/core/resultHelpers';
import type { MenuSDK } from '../../sdk/menu/contracts/MenuSDK';
import { createStubMenuAdapter } from '../../sdk/menu/adapters/StubMenuAdapter';
import type { TenantId } from '../../sdk/core/types';
import type { ComboId, MenuId, MenuItemId } from '../../sdk/menu/types/branded';
import type { Menu, MenuItem } from '../../sdk/menu/dto';
import { MenuFacade } from '../menu/MenuFacade';
import { createMenuFacade } from '../menu/MenuFacadeFactory';
import {
  menuFeatureDisabledError,
  normalizeMenuError,
} from '../menu/MenuErrorMapper';
import {
  getMenuSessionSnapshot,
  resetMenuSession,
  subscribeMenuSession,
} from '../menu/MenuSession';
import type { MenuFacadeTelemetryEvent } from '../menu/MenuTelemetry';

const tenantId = 'tenant-facade-001';

const sampleMenu = (): Menu => ({
  menuId: 'menu-1' as MenuId,
  tenantId: tenantId as TenantId,
  name: 'Lunch Menu',
  categories: [
    {
      categoryId: 'cat-1' as import('../../sdk/menu/types/branded').MenuCategoryId,
      name: 'Mains',
      sortOrder: 1,
      itemIds: ['item-1'],
      active: true,
    },
  ],
  items: [
    {
      itemId: 'item-1' as MenuItemId,
      name: 'Thali',
      kind: 'item',
      categoryId: 'cat-1',
      price: { amount: 120, currency: 'INR' },
      availability: { available: true },
      active: true,
    },
  ],
  metadata: {
    source: 'mock',
    schemaVersion: '1.0.0',
    itemCount: 1,
    categoryCount: 1,
    generatedAt: '2026-06-27T10:00:00.000Z',
  },
  version: '1.0.0',
  updatedAt: '2026-06-27T10:00:00.000Z',
});

const emptyMenu = (): Menu => ({
  ...sampleMenu(),
  categories: [],
  items: [],
  metadata: {
    ...sampleMenu().metadata,
    itemCount: 0,
    categoryCount: 0,
  },
});

const createMockSdk = (overrides: Partial<MenuSDK> = {}): MenuSDK => {
  const stub = createStubMenuAdapter();
  return { ...stub, ...overrides };
};

describe('MenuFacade (M7 PR-5)', () => {
  beforeEach(() => {
    resetMenuSession();
  });

  it('createMenuFacade returns a MenuFacade instance', () => {
    const facade = createMenuFacade({
      isEnabled: () => true,
      sdk: createMockSdk(),
    });
    assert.ok(facade instanceof MenuFacade);
  });

  it('returns feature-disabled outcome when FF_MENU_ENABLED is off', async () => {
    const facade = createMenuFacade({
      isEnabled: () => false,
      sdk: createMockSdk({
        getMenu: async () => sdkOk(sampleMenu()),
      }),
    });

    const outcome = await facade.getMenu({ tenantId });
    assert.equal(outcome.ok, false);
    if (outcome.ok) return;
    assert.equal(outcome.error.featureDisabled, true);
    assert.equal(getMenuSessionSnapshot().status, 'disabled');
  });

  it('menuFeatureDisabledError is not retryable', () => {
    const error = menuFeatureDisabledError();
    assert.equal(error.retryable, false);
    assert.equal(error.code, 'NOT_CONFIGURED');
  });

  it('getMenu invokes MenuSDK and stores success session', async () => {
    const facade = createMenuFacade({
      isEnabled: () => true,
      sdk: createMockSdk({
        getMenu: async () => sdkOk(sampleMenu()),
      }),
    });

    const outcome = await facade.getMenu({ tenantId });
    assert.equal(outcome.ok, true);
    assert.equal(getMenuSessionSnapshot().status, 'success');
    assert.equal(getMenuSessionSnapshot().lastOperation, 'getMenu');
  });

  it('getMenu stores empty session when menu has no items or categories', async () => {
    const facade = createMenuFacade({
      isEnabled: () => true,
      sdk: createMockSdk({
        getMenu: async () => sdkOk(emptyMenu()),
      }),
    });

    const outcome = await facade.getMenu({ tenantId });
    assert.equal(outcome.ok, true);
    assert.equal(getMenuSessionSnapshot().status, 'empty');
  });

  it('listCategories stores empty session when no categories returned', async () => {
    const facade = createMenuFacade({
      isEnabled: () => true,
      sdk: createMockSdk({
        listCategories: async () => sdkOk([]),
      }),
    });

    const outcome = await facade.listCategories({ tenantId });
    assert.equal(outcome.ok, true);
    assert.equal(getMenuSessionSnapshot().status, 'empty');
  });

  it('searchMenu rejects empty text without calling SDK', async () => {
    let called = false;
    const facade = createMenuFacade({
      isEnabled: () => true,
      sdk: createMockSdk({
        searchMenu: async () => {
          called = true;
          return sdkOk({ hits: [], categories: [], totalHits: 0, queryText: '' });
        },
      }),
    });

    const outcome = await facade.searchMenu({ tenantId, text: '   ' });
    assert.equal(outcome.ok, false);
    if (outcome.ok) return;
    assert.equal(outcome.error.code, 'VALIDATION');
    assert.equal(called, false);
    assert.equal(getMenuSessionSnapshot().status, 'error');
  });

  it('searchMenu stores empty session when totalHits is zero', async () => {
    const facade = createMenuFacade({
      isEnabled: () => true,
      sdk: createMockSdk({
        searchMenu: async () =>
          sdkOk({ hits: [], categories: [], totalHits: 0, queryText: 'thali' }),
      }),
    });

    const outcome = await facade.searchMenu({ tenantId, text: 'thali' });
    assert.equal(outcome.ok, true);
    assert.equal(getMenuSessionSnapshot().status, 'empty');
  });

  it('getMenuItem returns item on success', async () => {
    const item = sampleMenu().items[0]!;
    const facade = createMenuFacade({
      isEnabled: () => true,
      sdk: createMockSdk({
        getMenuItem: async () => sdkOk(item),
      }),
    });

    const outcome = await facade.getMenuItem({ tenantId, itemId: 'item-1' });
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(outcome.value.name, 'Thali');
    assert.equal(getMenuSessionSnapshot().status, 'success');
  });

  it('getCombo returns combo on success', async () => {
    const facade = createMenuFacade({
      isEnabled: () => true,
      sdk: createMockSdk({
        getCombo: async () =>
          sdkOk({
            comboId: 'combo-1' as ComboId,
            name: 'Family Pack',
            components: [{ itemId: 'item-1' as MenuItemId, quantity: 1 }],
            price: { amount: 220, currency: 'INR' },
            availability: { available: true },
            active: true,
          }),
      }),
    });

    const outcome = await facade.getCombo({ tenantId, comboId: 'combo-1' });
    assert.equal(outcome.ok, true);
    assert.equal(getMenuSessionSnapshot().status, 'success');
  });

  it('validateMenu is synchronous and returns validation result', () => {
    const facade = createMenuFacade({
      isEnabled: () => true,
      sdk: createMockSdk({
        validateMenu: () =>
          sdkOk({
            valid: true,
            issues: [],
          }),
      }),
    });

    const outcome = facade.validateMenu({ tenantId });
    assert.equal(outcome.ok, true);
    assert.equal(getMenuSessionSnapshot().status, 'success');
  });

  it('normalizes NOT_CONFIGURED SDK errors for presentation', async () => {
    const facade = createMenuFacade({
      isEnabled: () => true,
      sdk: createStubMenuAdapter(),
    });

    const outcome = await facade.getMenu({ tenantId });
    assert.equal(outcome.ok, false);
    if (outcome.ok) return;
    assert.equal(outcome.error.code, 'NOT_CONFIGURED');
    assert.match(outcome.error.userMessage, /not available/i);
    assert.equal(getMenuSessionSnapshot().status, 'error');
  });

  it('normalizeMenuError maps NOT_FOUND with user-friendly message', () => {
    const normalized = normalizeMenuError({
      code: 'NOT_FOUND',
      message: 'item missing',
    });
    assert.equal(normalized.code, 'NOT_FOUND');
    assert.match(normalized.userMessage, /not found/i);
    assert.equal(normalized.retryable, false);
  });

  it('normalizeMenuError marks UNAVAILABLE as retryable', () => {
    const normalized = normalizeMenuError({
      code: 'UNAVAILABLE',
      message: 'timeout',
    });
    assert.equal(normalized.retryable, true);
    assert.match(normalized.userMessage, /temporarily unavailable/i);
  });

  it('normalizeMenuError maps VALIDATION errors', () => {
    const normalized = normalizeMenuError({
      code: 'VALIDATION',
      message: 'Invalid tenant',
    });
    assert.equal(normalized.code, 'VALIDATION');
    assert.equal(normalized.retryable, false);
  });

  it('normalizeMenuError maps unknown SDK codes to UNKNOWN', () => {
    const normalized = normalizeMenuError({
      code: 'INTERNAL' as 'UNKNOWN',
      message: 'boom',
    });
    assert.equal(normalized.code, 'UNKNOWN');
    assert.equal(normalized.retryable, true);
  });

  it('retry re-runs last query and increments retry count on failure', async () => {
    const retryableFail = async () =>
      sdkFail(sdkError('UNAVAILABLE', 'temporary', { retryable: true }));

    const facade = createMenuFacade({
      isEnabled: () => true,
      sdk: createMockSdk({ getMenu: retryableFail }),
    });

    await facade.getMenu({ tenantId });
    assert.equal(getMenuSessionSnapshot().retryCount, 1);

    const retry = await facade.retry();
    assert.equal(retry.ok, false);
    assert.equal(getMenuSessionSnapshot().retryCount, 2);
    assert.equal(getMenuSessionSnapshot().status, 'error');
  });

  it('retry returns validation error when no prior request exists', async () => {
    const facade = createMenuFacade({
      isEnabled: () => true,
      sdk: createMockSdk(),
    });

    const outcome = await facade.retry();
    assert.equal(outcome.ok, false);
    if (outcome.ok) return;
    assert.equal(outcome.error.code, 'VALIDATION');
  });

  it('retry blocks after maximum attempts', async () => {
    const retryableFail = async () =>
      sdkFail(sdkError('UNAVAILABLE', 'temporary', { retryable: true }));

    const facade = createMenuFacade({
      isEnabled: () => true,
      sdk: createMockSdk({ getMenu: retryableFail }),
    });

    await facade.getMenu({ tenantId });
    await facade.retry();
    await facade.retry();

    const blocked = await facade.retry();
    assert.equal(blocked.ok, false);
    if (blocked.ok) return;
    assert.match(blocked.error.message, /maximum retry/i);
  });

  it('subscribeMenuSession notifies listeners on state changes', async () => {
    const statuses: string[] = [];
    const facade = createMenuFacade({
      isEnabled: () => true,
      sdk: createMockSdk({
        getMenu: async () => sdkOk(emptyMenu()),
      }),
    });

    const unsubscribe = facade.subscribeSession((snapshot) => {
      statuses.push(snapshot.status);
    });

    await facade.getMenu({ tenantId });
    unsubscribe();

    assert.ok(statuses.includes('loading'));
    assert.ok(statuses.includes('empty'));
  });

  it('getSessionSnapshot returns current session state', async () => {
    const facade = createMenuFacade({
      isEnabled: () => true,
      sdk: createMockSdk({
        getMenu: async () => sdkOk(sampleMenu()),
      }),
    });

    assert.equal(facade.getSessionSnapshot().status, 'idle');
    await facade.getMenu({ tenantId });
    assert.equal(facade.getSessionSnapshot().status, 'success');
  });

  it('resetSession returns session to idle', async () => {
    const facade = createMenuFacade({
      isEnabled: () => true,
      sdk: createMockSdk({
        getMenu: async () => sdkOk(sampleMenu()),
      }),
    });

    await facade.getMenu({ tenantId });
    facade.resetSession();
    assert.equal(getMenuSessionSnapshot().status, 'idle');
    assert.equal(getMenuSessionSnapshot().lastOperation, null);
  });

  it('emits facade telemetry events', async () => {
    const events: MenuFacadeTelemetryEvent[] = [];
    const facade = createMenuFacade({
      isEnabled: () => true,
      onTelemetry: (event) => events.push(event),
      sdk: createMockSdk({
        getMenu: async () => sdkOk(sampleMenu()),
      }),
    });

    await facade.getMenu({ tenantId });
    facade.resetSession();

    assert.ok(events.some((event) => event.type === 'menu_facade_request'));
    assert.ok(events.some((event) => event.type === 'menu_facade_success'));
    assert.ok(events.some((event) => event.type === 'menu_facade_reset'));
  });

  it('emits failure and retry telemetry', async () => {
    const events: MenuFacadeTelemetryEvent[] = [];
    const retryableFail = async () =>
      sdkFail(sdkError('UNAVAILABLE', 'temporary', { retryable: true }));

    const facade = createMenuFacade({
      isEnabled: () => true,
      onTelemetry: (event) => events.push(event),
      sdk: createMockSdk({ getMenu: retryableFail }),
    });

    await facade.getMenu({ tenantId });
    await facade.retry();

    assert.ok(events.some((event) => event.type === 'menu_facade_failure'));
    assert.ok(events.some((event) => event.type === 'menu_facade_retry'));
  });
});
