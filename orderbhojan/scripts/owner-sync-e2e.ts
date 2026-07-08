#!/usr/bin/env node
/**
 * Playwright E2E — owner publish/edit → OrderBhojan customer UI within SLA.
 *
 * Prerequisites:
 *   1. Backend: PORT=8081 FIREBASE_PROJECT_ID=… GOOGLE_APPLICATION_CREDENTIALS=… npm run dev
 *   2. OrderBhojan (Firestore per build):
 *        VITE_FF_OB_FIRESTORE=true VITE_MARKETPLACE_API_PROXY=http://localhost:8081 npm run dev -- --port 5180
 *   3. FIREBASE_WEB_API_KEY or VITE_FIREBASE_API_KEY (owner menu PUT auth in harness)
 *
 * Run from orderbhojan/: npm run test:e2e:owner-sync
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  E2E_SYNC_LAB_BASE_NAME,
  E2E_SYNC_LAB_MENU_ITEM_NAME,
  E2E_SYNC_LAB_TENANT_ID,
  E2E_SYNC_LAB_VARIANT_HALF,
  OWNER_MARKETPLACE_SYNC_SLA_MS,
  isE2eFirebaseConfigured,
  prepareE2eSyncLabDraft,
  publishE2eSyncLab,
  unpublishE2eSyncLab,
  updateE2eSyncLabMenuItemViaOwnerApi,
  updateE2eSyncLabName,
} from '../../scripts/e2e/e2eSyncLabHarness.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ORDERBHOJAN_URL = process.env.E2E_ORDERBHOJAN_URL ?? 'http://localhost:5180';
const MARKETPLACE_API = process.env.E2E_MARKETPLACE_API ?? 'http://localhost:8081';

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    execSync('npx playwright install chromium', { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
    return import('playwright');
  }
}

async function assertReachable(label: string, url: string): Promise<void> {
  const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  if (!response.ok) {
    throw new Error(`${label} returned ${response.status} for ${url}`);
  }
}

async function waitForDiscoveryRestaurant(
  page: import('playwright').Page,
  displayName: string,
  deadlineMs: number,
): Promise<number> {
  const started = Date.now();
  const locator = page.locator('.ob-discovery-card').filter({ hasText: displayName });

  while (Date.now() - started < deadlineMs) {
    if (await locator.first().isVisible().catch(() => false)) {
      return Date.now() - started;
    }
    await page.waitForTimeout(250);
  }

  throw new Error(
    `Restaurant "${displayName}" not visible on discovery home within ${deadlineMs}ms`,
  );
}

async function waitForRestaurantPageName(
  page: import('playwright').Page,
  displayName: string,
  deadlineMs: number,
): Promise<number> {
  const started = Date.now();
  const locator = page.getByText(displayName, { exact: true });

  while (Date.now() - started < deadlineMs) {
    if (await locator.first().isVisible().catch(() => false)) {
      return Date.now() - started;
    }
    await page.waitForTimeout(250);
  }

  throw new Error(
    `Restaurant page did not show "${displayName}" within ${deadlineMs}ms`,
  );
}

async function waitForRestaurantAbsentFromHome(
  page: import('playwright').Page,
  displayName: string,
  timeoutMs: number,
): Promise<void> {
  const locator = page.locator('.ob-discovery-card').filter({ hasText: displayName });
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!(await locator.first().isVisible().catch(() => false))) {
      return;
    }
    await page.waitForTimeout(250);
  }
  throw new Error(`Restaurant "${displayName}" still visible after unpublish`);
}

async function runPublishSyncTest(page: import('playwright').Page): Promise<void> {
  console.log('\n[e2e] Scenario 1 — owner publish → discovery home');

  await prepareE2eSyncLabDraft();
  await unpublishE2eSyncLab();

  await page.goto(`${ORDERBHOJAN_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForSelector('.ob-discovery-feed, .ob-discovery-empty', { timeout: 20_000 });
  await waitForRestaurantAbsentFromHome(page, E2E_SYNC_LAB_BASE_NAME, 12_000);

  const publishStarted = Date.now();
  await publishE2eSyncLab();

  const elapsed = await waitForDiscoveryRestaurant(
    page,
    E2E_SYNC_LAB_BASE_NAME,
    OWNER_MARKETPLACE_SYNC_SLA_MS,
  );

  console.log(`  PASS  publish → home visible in ${elapsed}ms (budget ${OWNER_MARKETPLACE_SYNC_SLA_MS}ms)`);
  if (elapsed > OWNER_MARKETPLACE_SYNC_SLA_MS) {
    throw new Error(`Publish sync exceeded SLA: ${elapsed}ms`);
  }
  console.log(`  INFO  wall clock since publish call: ${Date.now() - publishStarted}ms`);
}

async function runEditSyncTest(page: import('playwright').Page): Promise<void> {
  console.log('\n[e2e] Scenario 2 — owner storefront edit → restaurant page');

  await prepareE2eSyncLabDraft();
  await publishE2eSyncLab();

  const editedName = `${E2E_SYNC_LAB_BASE_NAME} ${Date.now()}`;

  await page.goto(`${ORDERBHOJAN_URL}/restaurant/${E2E_SYNC_LAB_TENANT_ID}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  await page.waitForSelector('.ob-restaurant-px5', { timeout: 20_000 });
  await waitForRestaurantPageName(page, E2E_SYNC_LAB_BASE_NAME, 15_000);

  const editStarted = Date.now();
  await updateE2eSyncLabName(editedName);

  const elapsed = await waitForRestaurantPageName(
    page,
    editedName,
    OWNER_MARKETPLACE_SYNC_SLA_MS,
  );

  console.log(`  PASS  edit → restaurant page updated in ${elapsed}ms (budget ${OWNER_MARKETPLACE_SYNC_SLA_MS}ms)`);
  if (elapsed > OWNER_MARKETPLACE_SYNC_SLA_MS) {
    throw new Error(`Edit sync exceeded SLA: ${elapsed}ms`);
  }
  console.log(`  INFO  wall clock since edit call: ${Date.now() - editStarted}ms`);

  await updateE2eSyncLabName(E2E_SYNC_LAB_BASE_NAME);
}

async function waitForMenuVariantInCustomizeSheet(
  page: import('playwright').Page,
  itemName: string,
  variantLabel: string,
  deadlineMs: number,
): Promise<number> {
  const started = Date.now();
  const addButton = page.getByRole('button', { name: `Add ${itemName}`, exact: true });
  const sheet = page.locator('.ob-food-px6__sheet');

  while (Date.now() - started < deadlineMs) {
    await addButton.click();
    const variantVisible = await sheet.getByText(variantLabel, { exact: true }).isVisible().catch(() => false);
    if (variantVisible) {
      return Date.now() - started;
    }
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(250);
  }

  throw new Error(
    `Menu item "${itemName}" did not show variant "${variantLabel}" within ${deadlineMs}ms`,
  );
}

async function runMenuVariantSyncTest(page: import('playwright').Page): Promise<void> {
  console.log('\n[e2e] Scenario 3 — owner menu variant → OrderBhojan customize sheet');

  await prepareE2eSyncLabDraft();
  await publishE2eSyncLab();

  await page.goto(`${ORDERBHOJAN_URL}/restaurant/${E2E_SYNC_LAB_TENANT_ID}/menu`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  await page.waitForSelector('.ob-food-px6', { timeout: 20_000 });
  await page.getByText(E2E_SYNC_LAB_MENU_ITEM_NAME, { exact: true }).first().waitFor({ timeout: 15_000 });

  const updateStarted = Date.now();
  await updateE2eSyncLabMenuItemViaOwnerApi(
    { variants: [{ kind: 'half', displayName: E2E_SYNC_LAB_VARIANT_HALF, price: 169 }] },
    MARKETPLACE_API,
  );

  const elapsed = await waitForMenuVariantInCustomizeSheet(
    page,
    E2E_SYNC_LAB_MENU_ITEM_NAME,
    E2E_SYNC_LAB_VARIANT_HALF,
    OWNER_MARKETPLACE_SYNC_SLA_MS,
  );

  console.log(
    `  PASS  menu variant → customize sheet in ${elapsed}ms (budget ${OWNER_MARKETPLACE_SYNC_SLA_MS}ms)`,
  );
  if (elapsed > OWNER_MARKETPLACE_SYNC_SLA_MS) {
    throw new Error(`Menu variant sync exceeded SLA: ${elapsed}ms`);
  }
  console.log(`  INFO  wall clock since owner menu PUT: ${Date.now() - updateStarted}ms`);

  await page.keyboard.press('Escape').catch(() => {});
  await updateE2eSyncLabMenuItemViaOwnerApi({ variants: [], addonGroups: [] }, MARKETPLACE_API);
}

async function main() {
  if (!isE2eFirebaseConfigured()) {
    if (process.env.E2E_REQUIRE_FIREBASE === 'true') {
      console.error('[e2e] FIREBASE_PROJECT_ID required (set E2E_REQUIRE_FIREBASE=false to skip)');
      process.exit(1);
    }
    console.log('[e2e] SKIP — FIREBASE_PROJECT_ID not set (owner sync E2E needs Firestore + running servers)');
    process.exit(0);
  }

  console.log('[e2e] Owner → OrderBhojan sync certification');
  console.log(`  orderbhojan: ${ORDERBHOJAN_URL}`);
  console.log(`  marketplace: ${MARKETPLACE_API}`);
  console.log(`  tenant:      ${E2E_SYNC_LAB_TENANT_ID}`);
  console.log(`  SLA:         ${OWNER_MARKETPLACE_SYNC_SLA_MS}ms`);

  await assertReachable('OrderBhojan', ORDERBHOJAN_URL);
  await assertReachable('Marketplace API', `${MARKETPLACE_API}/api/health`);

  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();

    await runPublishSyncTest(page);
    await runEditSyncTest(page);
    await runMenuVariantSyncTest(page);

    console.log('\n[e2e] All owner → marketplace sync scenarios passed.');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error('\n[e2e] FAILED', error instanceof Error ? error.message : error);
  process.exit(1);
});
